import asyncio
import hashlib
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse

from feedio.bootstrap.config import Settings, get_settings
from feedio.modules.media.application.ports import StorageService
from feedio.modules.media.infrastructure.appwrite_storage import storage_key_to_file_id
from feedio.modules.media.infrastructure.upload_token import (
    InvalidUploadTokenError,
    verify_upload_token,
)

StorageServiceProvider = Callable[..., StorageService]


def create_storage_upload_router(
    storage_service_provider: StorageServiceProvider,
    settings_provider: Callable[[], Settings] | None = None,
) -> APIRouter:
    """Router providing authenticated streaming PUT upload endpoints."""
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

    @router.get("/view/{file_id}", summary="Stream direct media file with Range support")
    async def view_file(
        file_id: str,
        request: Request,
        settings: Annotated[Settings, Depends(settings_dep)],
    ) -> StreamingResponse:
        prefixes = ("rw_", "pr_", "th_", "fs_", "vt_", "hl_", "wf_", "av_", "f_")
        clean_id = (
            storage_key_to_file_id(file_id)
            if ("/" in file_id or not file_id.startswith(prefixes))
            else file_id
        )

        headers: dict[str, str] = {
            "X-Appwrite-Project": settings.appwrite_project_id,
        }
        if settings.appwrite_api_key:
            headers["X-Appwrite-Key"] = settings.appwrite_api_key

        range_header = request.headers.get("Range")
        if range_header:
            headers["Range"] = range_header

        endpoint = settings.appwrite_endpoint.rstrip("/")
        bucket = settings.appwrite_bucket_id
        url = f"{endpoint}/storage/buckets/{bucket}/files/{clean_id}/view"
        client = httpx.AsyncClient(timeout=120.0)
        try:
            req = client.build_request("GET", url, headers=headers)
            r = await client.send(req, stream=True)
            if r.status_code == status.HTTP_404_NOT_FOUND:
                await r.aclose()
                await client.aclose()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

            if r.status_code not in (status.HTTP_200_OK, status.HTTP_206_PARTIAL_CONTENT):
                await r.aclose()
                await client.aclose()
                raise HTTPException(
                    status_code=r.status_code,
                    detail="Failed to retrieve file from storage",
                )

            response_headers: dict[str, str] = {
                "Accept-Ranges": "bytes",
                "Cache-Control": r.headers.get("Cache-Control", "public, max-age=86400"),
            }
            if "Content-Range" in r.headers:
                response_headers["Content-Range"] = r.headers["Content-Range"]
            if "Content-Length" in r.headers:
                response_headers["Content-Length"] = r.headers["Content-Length"]
            if "Content-Disposition" in r.headers:
                response_headers["Content-Disposition"] = r.headers["Content-Disposition"]

            async def body_stream():
                try:
                    async for chunk in r.aiter_bytes(chunk_size=128 * 1024):
                        yield chunk
                finally:
                    await r.aclose()
                    await client.aclose()

            return StreamingResponse(
                body_stream(),
                status_code=r.status_code,
                media_type=r.headers.get("Content-Type", "application/octet-stream"),
                headers=response_headers,
            )
        except HTTPException:
            raise
        except Exception as exc:
            await client.aclose()
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
    ) -> StreamingResponse:
        prefixes = ("rw_", "pr_", "th_", "fs_", "vt_", "hl_", "wf_", "av_", "f_")
        clean_id = (
            storage_key_to_file_id(file_id)
            if ("/" in file_id or not file_id.startswith(prefixes))
            else file_id
        )

        headers: dict[str, str] = {
            "X-Appwrite-Project": settings.appwrite_project_id,
        }
        if settings.appwrite_api_key:
            headers["X-Appwrite-Key"] = settings.appwrite_api_key

        endpoint = settings.appwrite_endpoint.rstrip("/")
        bucket = settings.appwrite_bucket_id
        url = (
            f"{endpoint}/storage/buckets/{bucket}/files/{clean_id}/preview"
            f"?project={settings.appwrite_project_id}&output=webp&width={width}"
        )
        client = httpx.AsyncClient(timeout=60.0)
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
                    await client.aclose()
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="File not found",
                    )

            cache_ctrl = r.headers.get("Cache-Control", "public, max-age=604800, immutable")
            response_headers: dict[str, str] = {
                "Cache-Control": cache_ctrl,
            }


            if "Content-Length" in r.headers:
                response_headers["Content-Length"] = r.headers["Content-Length"]
            if "Content-Disposition" in r.headers:
                response_headers["Content-Disposition"] = r.headers["Content-Disposition"]

            async def body_stream():
                try:
                    async for chunk in r.aiter_bytes(chunk_size=64 * 1024):
                        yield chunk
                finally:
                    await r.aclose()
                    await client.aclose()

            return StreamingResponse(
                body_stream(),
                status_code=r.status_code,
                media_type=r.headers.get("Content-Type", "image/webp"),
                headers=response_headers,
            )
        except HTTPException:
            raise
        except Exception as exc:
            await client.aclose()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc

    return router

