import json
import os
import shutil
import tempfile
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import structlog

logger = structlog.get_logger()

DEFAULT_MAX_CACHE_BYTES = 1_500_000_000  # 1.5 GB cap for 35GB NVMe VPS
DEFAULT_MAX_SINGLE_CACHE_BYTES = 120 * 1024 * 1024  # Cache assets up to 120 MB
STALE_TEMP_TTL_SECONDS = 7200  # 2 hours


@dataclass(frozen=True, slots=True)
class CachedMediaSlice:
    file_path: Path
    media_type: str
    total_size: int
    start: int
    end: int
    is_partial: bool


def parse_byte_range(range_header: str | None, total_size: int) -> tuple[int, int, bool] | None:
    """Parse RFC 9110 single byte range. Returns (start, end, is_partial) or None if invalid."""
    if not range_header or total_size <= 0:
        return (0, max(0, total_size - 1), False)

    header = range_header.strip()
    if not header.lower().startswith("bytes="):
        return (0, total_size - 1, False)

    spec = header[6:].split(",")[0].strip()
    if "-" not in spec:
        return None

    start_str, end_str = spec.split("-", 1)
    try:
        if start_str == "":
            # Suffix range: bytes=-500
            suffix_len = int(end_str)
            if suffix_len <= 0:
                return None
            start = max(0, total_size - suffix_len)
            end = total_size - 1
        else:
            start = int(start_str)
            end = int(end_str) if end_str else total_size - 1
    except ValueError:
        return None

    if start < 0 or start >= total_size or end < start:
        return None

    return (start, min(end, total_size - 1), True)


class LocalMediaCache:
    """Bounded NVMe disk LRU cache for instant video Range scrubbing and WebP previews."""

    def __init__(
        self,
        cache_dir: str | Path | None = None,
        max_bytes: int = DEFAULT_MAX_CACHE_BYTES,
        max_single_file_bytes: int = DEFAULT_MAX_SINGLE_CACHE_BYTES,
    ) -> None:
        preferred = Path(cache_dir) if cache_dir else Path(tempfile.gettempdir()) / "feedio_media"
        self._dir = self._ensure_writable_dir(preferred)
        self._max_bytes = max(32 * 1024 * 1024, max_bytes)
        self._max_single_bytes = max_single_file_bytes
        self._writes_since_Sweep = 0

    @property
    def cache_dir(self) -> Path:
        return self._dir

    @property
    def max_single_file_bytes(self) -> int:
        return self._max_single_bytes

    @staticmethod
    def _ensure_writable_dir(preferred: Path) -> Path:
        try:
            preferred.mkdir(parents=True, exist_ok=True)
            probe = preferred / f".probe_{os.getpid()}"
            probe.write_bytes(b"ok")
            probe.unlink(missing_ok=True)
            return preferred
        except OSError:
            fallback = Path(tempfile.gettempdir()) / "feedio_media_cache"
            fallback.mkdir(parents=True, exist_ok=True)
            return fallback

    @staticmethod
    def _safe_key(cache_key: str) -> str:
        return "".join(ch if (ch.isalnum() or ch in "._-") else "_" for ch in cache_key)[:80]

    def _paths(self, cache_key: str) -> tuple[Path, Path]:
        safe = self._safe_key(cache_key)
        return self._dir / f"{safe}.bin", self._dir / f"{safe}.meta"

    def get_bytes(self, cache_key: str) -> tuple[bytes, str] | None:
        data_path, meta_path = self._paths(cache_key)
        if not data_path.exists():
            return None
        try:
            size = data_path.stat().st_size
            if size <= 0:
                return None
            now = time.time()
            os.utime(data_path, (now, now))
            mime = "application/octet-stream"
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                mime = str(meta.get("mime_type") or mime)
            return data_path.read_bytes(), mime
        except OSError:
            return None

    def resolve_slice(
        self,
        cache_key: str,
        range_header: str | None,
    ) -> CachedMediaSlice | str | None:
        """Return CachedMediaSlice on hit, 'unsatisfiable' on 416, or None on miss."""
        data_path, meta_path = self._paths(cache_key)
        if not data_path.exists():
            return None
        try:
            total_size = data_path.stat().st_size
            if total_size <= 0:
                return None
            now = time.time()
            os.utime(data_path, (now, now))
            mime = "video/mp4"
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                mime = str(meta.get("mime_type") or mime)
            parsed = parse_byte_range(range_header, total_size)
            if parsed is None:
                return "unsatisfiable"
            start, end, is_partial = parsed
            return CachedMediaSlice(
                file_path=data_path,
                media_type=mime,
                total_size=total_size,
                start=start,
                end=end,
                is_partial=is_partial,
            )
        except OSError:
            return None

    def put_bytes(self, cache_key: str, data: bytes, mime_type: str) -> None:
        if not data or len(data) > self._max_single_bytes:
            return
        data_path, meta_path = self._paths(cache_key)
        tmp_path = self._dir / f".tmp_{uuid4().hex}"
        try:
            self._dir.mkdir(parents=True, exist_ok=True)
            tmp_path.write_bytes(data)
            os.replace(tmp_path, data_path)
            meta_path.write_text(json.dumps({"mime_type": mime_type}), encoding="utf-8")
            self.enforce_budget()
        except OSError as exc:
            logger.warn("media_cache_put_bytes_failed", error=str(exc))
            tmp_path.unlink(missing_ok=True)

    def put_file(self, cache_key: str, source_path: Path, mime_type: str) -> None:
        try:
            if not source_path.exists():
                return
            size = source_path.stat().st_size
            if size <= 0 or size > self._max_single_bytes:
                return
            data_path, meta_path = self._paths(cache_key)
            tmp_path = self._dir / f".tmp_{uuid4().hex}"
            self._dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_path, tmp_path)
            os.replace(tmp_path, data_path)
            meta_path.write_text(json.dumps({"mime_type": mime_type}), encoding="utf-8")
            self.enforce_budget()
        except OSError as exc:
            logger.warn("media_cache_put_file_failed", error=str(exc))

    def evict(self, cache_key: str) -> None:
        data_path, meta_path = self._paths(cache_key)
        data_path.unlink(missing_ok=True)
        meta_path.unlink(missing_ok=True)

    def enforce_budget(self) -> None:
        """Evict least-recently-used cached files above max_bytes and purge stale /tmp dirs."""
        try:
            entries: list[tuple[float, int, Path]] = []
            total = 0
            now = time.time()
            for entry in self._dir.iterdir():
                if entry.name.startswith(".tmp_"):
                    if now - entry.stat().st_mtime > STALE_TEMP_TTL_SECONDS:
                        entry.unlink(missing_ok=True)
                    continue
                if entry.suffix == ".bin" and entry.is_file():
                    st = entry.stat()
                    total += st.st_size
                    entries.append((st.st_mtime, st.st_size, entry))

            if total > self._max_bytes:
                entries.sort(key=lambda item: item[0])  # Oldest mtime first
                for _, sz, bin_file in entries:
                    if total <= int(self._max_bytes * 0.85):
                        break
                    bin_file.unlink(missing_ok=True)
                    bin_file.with_suffix(".meta").unlink(missing_ok=True)
                    total -= sz

            self._writes_since_Sweep += 1
            if self._writes_since_Sweep % 10 == 0:
                self._cleanup_stale_multipart_dirs(now)
        except OSError:
            pass

    @staticmethod
    def _cleanup_stale_multipart_dirs(now: float) -> None:
        tmp_root = Path(tempfile.gettempdir())
        try:
            for item in tmp_root.glob("feedio_mp_*"):
                if item.is_dir() and (now - item.stat().st_mtime) > STALE_TEMP_TTL_SECONDS:
                    shutil.rmtree(item, ignore_errors=True)
        except OSError:
            pass


async def iter_file_slice(
    file_path: Path,
    start: int,
    length: int,
    chunk_size: int = 128 * 1024,
) -> AsyncIterator[bytes]:
    import asyncio

    def _read_chunk(offset: int, to_read: int) -> bytes:
        with open(file_path, "rb") as f:
            f.seek(offset)
            return f.read(to_read)

    pos = start
    remaining = length
    while remaining > 0:
        step = min(chunk_size, remaining)
        chunk = await asyncio.to_thread(_read_chunk, pos, step)
        if not chunk:
            break
        yield chunk
        pos += len(chunk)
        remaining -= len(chunk)
