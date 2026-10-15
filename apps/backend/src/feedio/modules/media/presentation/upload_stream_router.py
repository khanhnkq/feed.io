import asyncio
import hashlib
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

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

    return router
