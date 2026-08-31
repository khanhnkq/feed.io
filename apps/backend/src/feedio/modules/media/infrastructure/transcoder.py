import asyncio
import json
import os
import shutil
import tempfile
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog

from feedio.modules.media.application.ports import StorageService
from feedio.modules.media.infrastructure.filmstrip_generator import FilmstripGenerator

logger = structlog.get_logger()

ProgressCallback = Callable[[int, str], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class MediaProbeResult:
    duration_seconds: float
    width: int
    height: int
    fps: float
    codec: str


@dataclass(frozen=True, slots=True)
class TranscodeResult:
    duration_seconds: float
    width: int
    height: int
    fps: float
    thumbnail_storage_key: str | None
    hls_storage_key: str | None
    proxy_storage_key: str | None
    filmstrip_storage_key: str | None
    filmstrip_vtt_storage_key: str | None
    waveform_data: str | None


class FFmpegTranscoder:
    def __init__(self, storage: StorageService) -> None:
        self._storage = storage
        self._ffmpeg_available = shutil.which("ffmpeg") is not None
        self._ffprobe_available = shutil.which("ffprobe") is not None
        self._filmstrip_generator = FilmstripGenerator()

    async def probe_file(self, file_path: Path) -> MediaProbeResult:
        """Probe video/audio file using ffprobe to extract frame rate, resolution, duration."""
        if not self._ffprobe_available:
            return MediaProbeResult(
                duration_seconds=10.0,
                width=1920,
                height=1080,
                fps=24.0,
                codec="h264",
            )

        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(file_path),
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            data: dict[str, Any] = json.loads(stdout.decode("utf-8"))
            format_info = data.get("format", {})
            duration = float(format_info.get("duration", 0.0))

            streams: list[dict[str, Any]] = data.get("streams", [])
            video_stream: dict[str, Any] = next(
                (s for s in streams if s.get("codec_type") == "video"),
                {},
            )
            width = int(video_stream.get("width", 1920 if video_stream else 0))
            height = int(video_stream.get("height", 1080 if video_stream else 0))
            codec = str(video_stream.get("codec_name", "h264"))

            fps_str = str(video_stream.get("r_frame_rate", "24/1"))
            fps = 24.0
            if "/" in fps_str:
                num, den = fps_str.split("/", 1)
                try:
                    denom_val = float(den)
                    if denom_val > 0:
                        fps = round(float(num) / denom_val, 3)
                except Exception:
                    fps = 24.0
            else:
                try:
                    fps = float(fps_str)
                except Exception:
                    fps = 24.0

            return MediaProbeResult(
                duration_seconds=duration,
                width=width,
                height=height,
                fps=fps,
                codec=codec,
            )
        except Exception as exc:
            logger.warn("ffprobe_parse_failed", error=str(exc))
            return MediaProbeResult(
                duration_seconds=10.0,
                width=1920,
                height=1080,
                fps=24.0,
                codec="h264",
            )

    async def extract_waveform(self, file_path: Path, num_points: int = 100) -> str:
        """Extract normalized audio waveform peaks vector (e.g. 100 points between 0.0 and 1.0)."""
        if not self._ffmpeg_available:
            sample = [round(0.2 + 0.6 * ((i % 10) / 10.0), 3) for i in range(num_points)]
            return json.dumps(sample)

        cmd = [
            "ffmpeg",
            "-v",
            "quiet",
            "-i",
            str(file_path),
            "-ac",
            "1",
            "-filter:a",
            f"aresample={num_points * 10}",
            "-f",
            "s8",
            "-",
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()

            if not stdout:
                sample = [0.1] * num_points
                return json.dumps(sample)

            raw_bytes = list(stdout)
            chunk_size = max(1, len(raw_bytes) // num_points)
            peaks: list[float] = []

            for i in range(num_points):
                start = i * chunk_size
                chunk = raw_bytes[start : start + chunk_size]
                if chunk:
                    max_val = max(abs(x - 128) for x in chunk)
                    normalized = min(1.0, round(max_val / 128.0, 3))
                    peaks.append(normalized)
                else:
                    peaks.append(0.1)

            peaks = [max(0.05, p) for p in peaks]
            return json.dumps(peaks)
        except Exception as exc:
            logger.warn("waveform_extraction_failed", error=str(exc))
            sample = [0.1] * num_points
            return json.dumps(sample)

    async def extract_thumbnail(
        self,
        file_path: Path,
        output_path: Path,
        timestamp_sec: float = 1.0,
    ) -> bool:
        """Extract poster frame thumbnail."""
        if not self._ffmpeg_available:
            return False

        cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "quiet",
            "-ss",
            str(timestamp_sec),
            "-i",
            str(file_path),
            "-vframes",
            "1",
            "-q:v",
            "2",
            str(output_path),
        ]

        proc = await asyncio.create_subprocess_exec(*cmd)
        await proc.communicate()

        def _check_thumb() -> bool:
            return output_path.exists() and output_path.stat().st_size > 0

        return await asyncio.to_thread(_check_thumb)

    async def generate_web_proxy(
        self,
        file_path: Path,
        output_path: Path,
    ) -> Path | None:
        """Generate faststart Web-compatible MP4 proxy (H.264 / AAC)."""
        if not self._ffmpeg_available:
            return None

        cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "quiet",
            "-i",
            str(file_path),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale=min(1280\\,iw):-2",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        proc = await asyncio.create_subprocess_exec(*cmd)
        await proc.communicate()

        def _check_proxy() -> bool:
            return output_path.exists() and output_path.stat().st_size > 0

        has_proxy = await asyncio.to_thread(_check_proxy)
        return output_path if has_proxy else None

    async def generate_hls_stream(
        self,
        file_path: Path,
        output_dir: Path,
    ) -> Path | None:
        """Generate HLS adaptive playlist and chunks for fast scrub review."""
        if not self._ffmpeg_available:
            return None

        playlist_path = output_dir / "master.m3u8"
        segment_pattern = str(output_dir / "seg_%03d.ts")

        cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "quiet",
            "-i",
            str(file_path),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-maxrate",
            "3500k",
            "-bufsize",
            "7000k",
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale=min(1920\\,iw):-2",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-hls_time",
            "4",
            "-hls_playlist_type",
            "vod",
            "-hls_segment_filename",
            segment_pattern,
            str(playlist_path),
        ]

        proc = await asyncio.create_subprocess_exec(*cmd)
        await proc.communicate()

        def _check_playlist() -> bool:
            return playlist_path.exists() and playlist_path.stat().st_size > 0

        has_playlist = await asyncio.to_thread(_check_playlist)
        return playlist_path if has_playlist else None

    async def transcode(
        self,
        storage_key: str,
        filename: str,
        mime_type: str = "video/mp4",
        on_progress: ProgressCallback | None = None,
    ) -> TranscodeResult:
        """Execute the complete transcode pipeline for a stored media asset."""
        async def _report(percent: int, stage: str) -> None:
            if on_progress:
                try:
                    await on_progress(percent, stage)
                except Exception as exc:
                    logger.warn("progress_callback_error", error=str(exc))

        with tempfile.TemporaryDirectory() as temp_dir_str:
            temp_dir = Path(temp_dir_str)
            local_source_file = temp_dir / filename

            await _report(5, "downloading_source")
            source_bytes = await self._storage.get_object_bytes(storage_key)
            await asyncio.to_thread(local_source_file.write_bytes, source_bytes)

            base_dir = os.path.dirname(storage_key)
            is_video = mime_type.startswith("video/") or mime_type in {
                "application/mp4",
                "video/quicktime",
            }
            is_audio = mime_type.startswith("audio/")

            # 1. Probe metadata
            await _report(15, "probing_media")
            probe = await self.probe_file(local_source_file)

            # 2. Extract Waveform
            await _report(30, "extracting_waveform")
            waveform_data = (
                await self.extract_waveform(local_source_file)
                if (is_video or is_audio)
                else None
            )

            # 3. Poster Thumbnail
            thumbnail_storage_key: str | None = None
            if is_video or mime_type.startswith("image/"):
                await _report(45, "generating_thumbnail")
                thumb_path = temp_dir / "thumbnail.jpg"
                thumb_time = min(1.0, probe.duration_seconds / 2.0)
                thumb_created = await self.extract_thumbnail(
                    local_source_file,
                    thumb_path,
                    timestamp_sec=thumb_time,
                )
                if thumb_created:
                    thumbnail_storage_key = f"{base_dir}/thumbnail.jpg"
                    thumb_bytes = await asyncio.to_thread(thumb_path.read_bytes)
                    await self._storage.upload_bytes(
                        storage_key=thumbnail_storage_key,
                        data=thumb_bytes,
                        mime_type="image/jpeg",
                    )

            # 4. Filmstrip Sprite Sheet & WebVTT (for videos)
            filmstrip_storage_key: str | None = None
            filmstrip_vtt_storage_key: str | None = None
            if is_video:
                await _report(60, "generating_filmstrip")
                filmstrip_dir = temp_dir / "filmstrip"
                fs_result = await self._filmstrip_generator.generate(
                    file_path=local_source_file,
                    output_dir=filmstrip_dir,
                    duration_seconds=probe.duration_seconds,
                )
                if fs_result.sprite_image_path:
                    filmstrip_storage_key = f"{base_dir}/filmstrip.jpg"
                    fs_bytes = await asyncio.to_thread(fs_result.sprite_image_path.read_bytes)
                    await self._storage.upload_bytes(
                        storage_key=filmstrip_storage_key,
                        data=fs_bytes,
                        mime_type="image/jpeg",
                    )
                if fs_result.vtt_path:
                    filmstrip_vtt_storage_key = f"{base_dir}/filmstrip.vtt"
                    vtt_bytes = await asyncio.to_thread(fs_result.vtt_path.read_bytes)
                    await self._storage.upload_bytes(
                        storage_key=filmstrip_vtt_storage_key,
                        data=vtt_bytes,
                        mime_type="text/vtt",
                    )

            # 5. HLS Stream (for videos)
            hls_storage_key: str | None = None
            if is_video:
                await _report(75, "generating_hls")
                hls_dir = temp_dir / "hls"
                hls_dir.mkdir(parents=True, exist_ok=True)
                hls_playlist = await self.generate_hls_stream(local_source_file, hls_dir)
                if hls_playlist:
                    hls_storage_key = f"{base_dir}/hls/master.m3u8"
                    for entry in hls_dir.iterdir():
                        if entry.is_file():
                            entry_key = f"{base_dir}/hls/{entry.name}"
                            entry_mime = (
                                "application/vnd.apple.mpegurl"
                                if entry.suffix == ".m3u8"
                                else "video/mp2t"
                            )
                            entry_bytes = await asyncio.to_thread(entry.read_bytes)
                            await self._storage.upload_bytes(
                                storage_key=entry_key,
                                data=entry_bytes,
                                mime_type=entry_mime,
                            )

            # 6. Web MP4 Proxy (for videos)
            proxy_storage_key: str | None = None
            if is_video:
                await _report(90, "generating_proxy")
                proxy_path = temp_dir / "proxy.mp4"
                web_proxy = await self.generate_web_proxy(local_source_file, proxy_path)
                if web_proxy:
                    proxy_storage_key = f"{base_dir}/proxy.mp4"
                    proxy_bytes = await asyncio.to_thread(proxy_path.read_bytes)
                    await self._storage.upload_bytes(
                        storage_key=proxy_storage_key,
                        data=proxy_bytes,
                        mime_type="video/mp4",
                    )

            await _report(100, "completed")
            return TranscodeResult(
                duration_seconds=probe.duration_seconds,
                width=probe.width,
                height=probe.height,
                fps=probe.fps,
                thumbnail_storage_key=thumbnail_storage_key,
                hls_storage_key=hls_storage_key,
                proxy_storage_key=proxy_storage_key,
                filmstrip_storage_key=filmstrip_storage_key,
                filmstrip_vtt_storage_key=filmstrip_vtt_storage_key,
                waveform_data=waveform_data,
            )
