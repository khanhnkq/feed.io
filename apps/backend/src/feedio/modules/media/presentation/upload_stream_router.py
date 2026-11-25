import asyncio
import hashlib
import os
import tempfile
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Annotated
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse

from feedio.bootstrap.config import Settings, get_settings
from feedio.modules.media.application.ports import StorageService
from feedio.modules.media.infrastructure.appwrite_storage import storage_key_to_file_id
from feedio.modules.media.infrastructure.local_media_cache import (
    CachedMediaSlice,
    LocalMediaCache,
    iter_file_slice,
)
from feedio.modules.media.infrastructure.upload_token import (
    InvalidUploadTokenError,
    verify_upload_token,
)

StorageServiceProvider = Callable[..., StorageService]

_storage_http_client: httpx.AsyncClient | None = None
_local_media_cache: LocalMediaCache | None = None
_local_media_cache_dir: str | None = None


def get_storage_http_client() -> httpx.AsyncClient:
    global _storage_http_client
    if _storage_http_client is None or _storage_http_client.is_closed:
        _storage_http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=120.0, write=120.0, pool=30.0),
            limits=httpx.Limits(
                max_keepalive_connections=50,
                max_connections=100,
                keepalive_expiry=60.0,
            ),
        )
    return _storage_http_client


def get_local_media_cache(settings: Settings) -> LocalMediaCache:
    global _local_media_cache, _local_media_cache_dir
    if _local_media_cache is None or _local_media_cache_dir != settings.media_cache_dir:
        _local_media_cache = LocalMediaCache(
            cache_dir=settings.media_cache_dir,
            max_bytes=settings.media_cache_max_bytes,
        )
        _local_media_cache_dir = settings.media_cache_dir
    return _local_media_cache


def create_storage_upload_router(
    storage_service_provider: StorageServiceProvider,
    settings_provider: Callable[[], Settings] | None = None,
) -> APIRouter:
    """Router providing authenticated streaming PUT uploads and NVMe-cached Range streaming."""
    router = APIRouter(prefix="/storage", tags=["storage"])
    settings_dep = settings_provider or get_settings

    @router.put("/upload", summary="Stream direct single or thumbnail media upload")
    async def upload_stream(
        request: Request,
        token: Annotated[str, Query(description="Signed upload authorization token")],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        settings: Annotated[Settings, Depends(settings_dep)],
    ) -> Response:
        try:
            payload = verify_upload_token(token, settings.auth_jwt_secret)
        except InvalidUploadTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid or expired upload token: {exc}",
            ) from exc

        if payload.get("type") != "single":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is not authorized for single file upload",
            )

        storage_key = payload["key"]
        mime_type = payload.get("mime", "application/octet-stream")

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_path = Path(tmp.name)

        def _append_chunk(data: bytes) -> None:
            with open(tmp_path, "ab") as f:
                f.write(data)

        def _read_and_clean() -> bytes:
            try:
                return tmp_path.read_bytes()
            finally:
                tmp_path.unlink(missing_ok=True)

        def _clean_only() -> None:
            tmp_path.unlink(missing_ok=True)

        hasher = hashlib.md5()
        total_bytes = 0
        async for chunk in request.stream():
            if chunk:
                await asyncio.to_thread(_append_chunk, chunk)
                hasher.update(chunk)
                total_bytes += len(chunk)

        try:
            if hasattr(storage, "upload_from_file"):
                await storage.upload_from_file(storage_key, tmp_path, mime_type)
                await asyncio.to_thread(_clean_only)
            else:
                data = await asyncio.to_thread(_read_and_clean)
                await storage.upload_bytes(storage_key, data, mime_type)
        except Exception:
            await asyncio.to_thread(_clean_only)
            raise

        etag = hasher.hexdigest()
        file_id = storage_key_to_file_id(storage_key) if hasattr(storage, "_storage") else etag

        return Response(
            status_code=status.HTTP_200_OK,
            headers={
                "ETag": f'"{etag}"',
                "X-Feedio-File-Id": file_id,
                "Content-Type": "application/json",
            },
            content=f'{{"status":"uploaded","bytes":{total_bytes}}}',
            media_type="application/json",
        )

    @router.put("/multipart/upload-part", summary="Stream multipart chunk upload")
    async def upload_multipart_part(
        request: Request,
        token: Annotated[str, Query(description="Signed multipart part token")],
        settings: Annotated[Settings, Depends(settings_dep)],
    ) -> Response:
        try:
            payload = verify_upload_token(token, settings.auth_jwt_secret)
        except InvalidUploadTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid or expired part token: {exc}",
            ) from exc

        if payload.get("type") != "multipart_part":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is not authorized for multipart part upload",
            )

        upload_id = payload.get("upload_id")
        part_number = payload.get("part")
        if not upload_id or part_number is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing upload_id or part number in token",
            )

        mp_dir = Path(tempfile.gettempdir()) / f"feedio_mp_{upload_id}"
        await asyncio.to_thread(mp_dir.mkdir, parents=True, exist_ok=True)
        part_file = mp_dir / f"part_{part_number}.bin"

        def _append_part(data: bytes) -> None:
            with open(part_file, "ab") as f:
                f.write(data)

        hasher = hashlib.md5()
        total_bytes = 0
        async for chunk in request.stream():
            if chunk:
                await asyncio.to_thread(_append_part, chunk)
                hasher.update(chunk)
                total_bytes += len(chunk)

        etag = hasher.hexdigest()

        return Response(
            status_code=status.HTTP_200_OK,
            headers={
                "ETag": f'"{etag}"',
                "Content-Type": "application/json",
            },
            content=f'{{"part_number":{part_number},"etag":"{etag}","bytes":{total_bytes}}}',
            media_type="application/json",
        )

    @router.get("/view/{file_id}", summary="Stream direct media file with NVMe cache & Range")
    async def view_file(
        file_id: str,
        request: Request,
        settings: Annotated[Settings, Depends(settings_dep)],
    ) -> Response:
        prefixes = ("rw_", "pr_", "th_", "fs_", "vt_", "hl_", "wf_", "av_", "f_")
        clean_id = (
            storage_key_to_file_id(file_id)
            if ("/" in file_id or not file_id.startswith(prefixes))
            else file_id
        )
        range_header = request.headers.get("Range")
        cache = get_local_media_cache(settings)

        # 1. Fast path: Serve directly from local NVMe SSD (<15ms latency for scrubbing)
        cached = await asyncio.to_thread(cache.resolve_slice, clean_id, range_header)
        if cached == "unsatisfiable":
            return Response(status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE)
        if isinstance(cached, CachedMediaSlice):
            slice_len = cached.end - cached.start + 1
            headers_hit = {
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                "Content-Length": str(slice_len),
                "X-Cache": "HIT-NVME",
            }
            if cached.is_partial:
                headers_hit["Content-Range"] = (
                    f"bytes {cached.start}-{cached.end}/{cached.total_size}"
                )
            return StreamingResponse(
                iter_file_slice(cached.file_path, cached.start, slice_len),
                status_code=(
                    status.HTTP_206_PARTIAL_CONTENT if cached.is_partial else status.HTTP_200_OK
                ),
                media_type=cached.media_type,
                headers=headers_hit,
            )

        # 2. Upstream fetch from Appwrite Cloud
        headers: dict[str, str] = {"X-Appwrite-Project": settings.appwrite_project_id}
        if settings.appwrite_api_key:
            headers["X-Appwrite-Key"] = settings.appwrite_api_key
        if range_header:
            headers["Range"] = range_header

        endpoint = settings.appwrite_endpoint.rstrip("/")
        bucket = settings.appwrite_bucket_id
        url = f"{endpoint}/storage/buckets/{bucket}/files/{clean_id}/view"
        client = get_storage_http_client()
        try:
            req = client.build_request("GET", url, headers=headers)
            r = await client.send(req, stream=True)
            if r.status_code == status.HTTP_404_NOT_FOUND:
                await r.aclose()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

            if r.status_code not in (status.HTTP_200_OK, status.HTTP_206_PARTIAL_CONTENT):
                await r.aclose()
                raise HTTPException(
                    status_code=r.status_code,
                    detail="Failed to retrieve file from storage",
                )

            response_headers: dict[str, str] = {
                "Accept-Ranges": "bytes",
                "Cache-Control": r.headers.get(
                    "Cache-Control", "public, max-age=86400, stale-while-revalidate=604800"
                ),
                "X-Cache": "MISS",
            }
            for hdr in ("Content-Range", "Content-Length", "Content-Disposition"):
                if hdr in r.headers:
                    response_headers[hdr] = r.headers[hdr]

            content_type = r.headers.get("Content-Type", "application/octet-stream")
            expected_len = int(r.headers["Content-Length"]) if "Content-Length" in r.headers else -1
            is_full_stream = r.status_code == status.HTTP_200_OK or (
                r.status_code == status.HTTP_206_PARTIAL_CONTENT
                and r.headers.get("Content-Range", "").startswith("bytes 0-")
                and expected_len > 0
                and r.headers.get("Content-Range", "").endswith(f"/{expected_len}")
            )
            should_cache = (
                is_full_stream
                and not clean_id.startswith("rw_")
                and 0 < expected_len <= cache.max_single_file_bytes
            )

            async def body_stream() -> AsyncIterator[bytes]:
                tmp_cache_file: Path | None = None
                written = 0
                if should_cache:
                    tmp_cache_file = cache.cache_dir / f".tmp_{uuid4().hex}"
                try:
                    async for chunk in r.aiter_bytes(chunk_size=128 * 1024):
                        if tmp_cache_file is not None and chunk:
                            await asyncio.to_thread(_append_tmp, tmp_cache_file, chunk)
                            written += len(chunk)
                        yield chunk
                    if tmp_cache_file is not None and written == expected_len:
                        await asyncio.to_thread(
                            _promote_tmp, cache, clean_id, tmp_cache_file, content_type
                        )
                        tmp_cache_file = None
                finally:
                    if tmp_cache_file is not None:
                        await asyncio.to_thread(tmp_cache_file.unlink, True)
                    await r.aclose()

            return StreamingResponse(
                body_stream(),
                status_code=r.status_code,
                media_type=content_type,
                headers=response_headers,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc

    @router.get("/preview/{file_id}", summary="Stream thumbnail or preview image")
    async def preview_file(
        file_id: str,
        request: Request,
        settings: Annotated[Settings, Depends(settings_dep)],
        width: int = 640,
    ) -> Response:
        prefixes = ("rw_", "pr_", "th_", "fs_", "vt_", "hl_", "wf_", "av_", "f_")
        clean_id = (
            storage_key_to_file_id(file_id)
            if ("/" in file_id or not file_id.startswith(prefixes))
            else file_id
        )
        cache_key = f"prev_{clean_id}_{width}"
        cache = get_local_media_cache(settings)

        hit = await asyncio.to_thread(cache.get_bytes, cache_key)
        if hit is not None:
            cached_bytes, cached_mime = hit
            return Response(
                content=cached_bytes,
                media_type=cached_mime,
                headers={
                    "Cache-Control": "public, max-age=604800, immutable",
                    "X-Cache": "HIT-NVME",
                },
            )

        headers: dict[str, str] = {"X-Appwrite-Project": settings.appwrite_project_id}
        if settings.appwrite_api_key:
            headers["X-Appwrite-Key"] = settings.appwrite_api_key

        endpoint = settings.appwrite_endpoint.rstrip("/")
        bucket = settings.appwrite_bucket_id
        url = (
            f"{endpoint}/storage/buckets/{bucket}/files/{clean_id}/preview"
            f"?project={settings.appwrite_project_id}&output=webp&width={width}"
        )
        client = get_storage_http_client()
        try:
            req = client.build_request("GET", url, headers=headers)
            r = await client.send(req, stream=True)
            if r.status_code == status.HTTP_404_NOT_FOUND:
                await r.aclose()
                fallback_url = f"{endpoint}/storage/buckets/{bucket}/files/{clean_id}/view"
                req = client.build_request("GET", fallback_url, headers=headers)
                r = await client.send(req, stream=True)
                if r.status_code == status.HTTP_404_NOT_FOUND:
                    await r.aclose()
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="File not found",
                    )

            cache_ctrl = r.headers.get("Cache-Control", "public, max-age=604800, immutable")
            response_headers: dict[str, str] = {"Cache-Control": cache_ctrl, "X-Cache": "MISS"}
            if "Content-Disposition" in r.headers:
                response_headers["Content-Disposition"] = r.headers["Content-Disposition"]

            raw_body = await r.aread()
            content_type = r.headers.get("Content-Type", "image/webp")
            await r.aclose()

            if r.status_code == status.HTTP_200_OK and len(raw_body) > 0:
                await asyncio.to_thread(cache.put_bytes, cache_key, raw_body, content_type)

            response_headers["Content-Length"] = str(len(raw_body))
            return Response(
                content=raw_body,
                status_code=r.status_code,
                media_type=content_type,
                headers=response_headers,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc

    return router


def _append_tmp(tmp_path: Path, data: bytes) -> None:
    with open(tmp_path, "ab") as f:
        f.write(data)


def _promote_tmp(cache: LocalMediaCache, key: str, tmp_path: Path, mime_type: str) -> None:
    data_path, meta_path = cache._paths(key)
    os.replace(tmp_path, data_path)
    meta_path.write_text(f'{{"mime_type":"{mime_type}"}}', encoding="utf-8")
    cache.enforce_budget()
