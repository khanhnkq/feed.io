import asyncio
import contextlib
import hashlib
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

import requests
from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.input_file import InputFile
from appwrite.services.storage import Storage

from feedio.bootstrap.config import Settings
from feedio.modules.media.infrastructure.upload_token import generate_upload_token


def storage_key_to_file_id(key: str) -> str:
    """Deterministically convert a feed.io hierarchical storage key into a valid Appwrite file_id.

    Appwrite file_id rules:
    - Maximum 36 characters.
    - Valid characters: [a-zA-Z0-9._-].
    - Must not start with a special character.
    """
    cleaned = key.strip()
    if not cleaned:
        return f"f_{uuid4().hex[:32]}"

    # If the key is already a valid standalone ID without path delimiters
    if "/" not in cleaned and re.match(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$", cleaned):
        return cleaned

    lower_key = cleaned.lower()
    uuids = re.findall(
        r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
        cleaned,
    )

    if uuids:
        # Use the deepest UUID in the path (which represents the media_id in feed.io)
        media_hex = uuids[-1].replace("-", "").lower()
        if "thumbnail" in lower_key or "optimized" in lower_key:
            return f"th_{media_hex}"
        if "proxy" in lower_key:
            return f"pr_{media_hex}"
        if "waveform" in lower_key:
            return f"wf_{media_hex}"
        if "vtt" in lower_key:
            return f"vt_{media_hex}"
        if "filmstrip" in lower_key or "sprite" in lower_key:
            return f"fs_{media_hex}"
        if "hls" in lower_key:
            hls_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:28]
            return f"hl_{hls_hash}"
        return f"rw_{media_hex}"

    # Fallback deterministic sha256 hash for arbitrary storage keys
    hashed = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:33]
    return f"f_{hashed}"


class AppwriteStorageService:
    """Production-grade Appwrite Cloud Storage provider implementing the StorageService protocol."""

    def __init__(self, settings: Settings) -> None:
        self._endpoint = settings.appwrite_endpoint.rstrip("/")
        self._project_id = settings.appwrite_project_id
        self._bucket = settings.appwrite_bucket_id
        self._api_key = settings.appwrite_api_key

        self._client = Client()
        self._client.set_endpoint(self._endpoint)
        self._client.set_project(self._project_id)
        if self._api_key:
            self._client.set_key(self._api_key)

        self._storage = Storage(self._client)
        self._api_base_url = settings.api_base_url.rstrip("/")
        self._auth_jwt_secret = settings.auth_jwt_secret
        self._multipart_sessions: dict[str, dict[str, Any]] = {}

    async def generate_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600,
    ) -> str:
        """Return a signed streaming PUT endpoint for seamless client upload."""
        token = generate_upload_token(
            secret=self._auth_jwt_secret,
            storage_key=storage_key,
            mime_type=mime_type,
            expires_in=expires_in,
            upload_type="single",
        )
        return f"{self._api_base_url}/api/v1/storage/upload?token={token}"

    async def generate_presigned_view_url(
        self,
        storage_key: str,
        expires_in: int = 7200,
    ) -> str:
        """Generate a high-performance CDN view or WebP preview URL from Appwrite Cloud."""
        file_id = storage_key_to_file_id(storage_key)
        lower_key = storage_key.lower()

        # For images and thumbnails, leverage Appwrite's built-in lossless WebP preview CDN
        is_image = any(
            lower_key.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")
        ) or any(tag in lower_key for tag in ("thumbnail", "thumb", "optimized"))

        if is_image:
            return (
                f"{self._endpoint}/storage/buckets/{self._bucket}/files/{file_id}/preview"
                f"?project={self._project_id}&output=webp&width=640"
            )

        # For video, audio and other media, stream via direct view URL
        return (
            f"{self._endpoint}/storage/buckets/{self._bucket}/files/{file_id}/view"
            f"?project={self._project_id}"
        )

    async def verify_object_exists(self, storage_key: str) -> bool:
        """Verify that the file exists in the Appwrite bucket."""
        file_id = storage_key_to_file_id(storage_key)

        def _get() -> bool:
            try:
                self._storage.get_file(bucket_id=self._bucket, file_id=file_id)
                return True
            except AppwriteException as exc:
                if exc.code == 404 or getattr(exc, "type", "") == "storage_file_not_found":
                    return False
                return False

        return await asyncio.to_thread(_get)

    async def delete_object(self, storage_key: str) -> None:
        """Delete a file from the Appwrite storage bucket."""
        file_id = storage_key_to_file_id(storage_key)

        def _delete() -> None:
            with contextlib.suppress(AppwriteException):
                self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

        await asyncio.to_thread(_delete)

    async def upload_bytes(
        self,
        storage_key: str,
        data: bytes,
        mime_type: str = "application/octet-stream",
    ) -> None:
        """Upload raw binary data into the Appwrite storage bucket."""
        file_id = storage_key_to_file_id(storage_key)
        filename = Path(storage_key).name or "file.bin"

        def _put() -> None:
            # Delete old file with same ID to ensure atomic replacement
            with contextlib.suppress(AppwriteException):
                self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

            input_file = InputFile.from_bytes(data, filename=filename, mime_type=mime_type)
            self._storage.create_file(
                bucket_id=self._bucket,
                file_id=file_id,
                file=input_file,
            )

        await asyncio.to_thread(_put)

    async def upload_from_file(
        self,
        storage_key: str,
        file_path: Path | str,
        mime_type: str = "application/octet-stream",
    ) -> None:
        """Upload a local file directly into the Appwrite storage bucket."""
        file_id = storage_key_to_file_id(storage_key)
        filename = Path(storage_key).name or "file.bin"

        def _put() -> None:
            with contextlib.suppress(AppwriteException):
                self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

            input_file = InputFile.from_path(str(file_path))
            input_file.filename = filename
            input_file.mime_type = mime_type
            self._storage.create_file(
                bucket_id=self._bucket,
                file_id=file_id,
                file=input_file,
            )

        await asyncio.to_thread(_put)

    async def get_object_bytes(
        self,
        storage_key: str,
    ) -> bytes:
        """Retrieve raw file content bytes from Appwrite Cloud."""
        file_id = storage_key_to_file_id(storage_key)

        def _download() -> bytes:
            return self._storage.get_file_download(bucket_id=self._bucket, file_id=file_id)

        return await asyncio.to_thread(_download)

    async def download_to_file(
        self,
        storage_key: str,
        dest_path: Path | str,
    ) -> None:
        """Stream download file directly to a local destination path without high RAM usage."""
        file_id = storage_key_to_file_id(storage_key)
        dest = Path(dest_path)

        def _download_stream() -> None:
            headers = {
                "X-Appwrite-Project": self._project_id,
            }
            if self._api_key:
                headers["X-Appwrite-Key"] = self._api_key

            url = f"{self._endpoint}/storage/buckets/{self._bucket}/files/{file_id}/download"
            with requests.get(url, headers=headers, stream=True, timeout=120.0) as r:
                r.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)

        await asyncio.to_thread(_download_stream)

    async def create_multipart_upload(
        self,
        storage_key: str,
        mime_type: str,
    ) -> str:
        """Initiate multipart upload tracking session."""
        upload_id = uuid4().hex
        mp_dir = Path(tempfile.gettempdir()) / f"feedio_mp_{upload_id}"
        mp_dir.mkdir(parents=True, exist_ok=True)
        self._multipart_sessions[upload_id] = {
            "storage_key": storage_key,
            "mime_type": mime_type,
            "dir": str(mp_dir),
        }
        return upload_id

    async def generate_presigned_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 3600,
    ) -> str:
        """Generate upload endpoint for a multipart chunk."""
        token = generate_upload_token(
            secret=self._auth_jwt_secret,
            storage_key=storage_key,
            mime_type="application/octet-stream",
            expires_in=expires_in,
            upload_type="multipart_part",
            upload_id=upload_id,
            part_number=part_number,
        )
        return f"{self._api_base_url}/api/v1/storage/multipart/upload-part?token={token}"

    async def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> None:
        """Complete multipart session: assemble chunks and upload to Appwrite."""
        session = self._multipart_sessions.pop(upload_id, None)
        mp_dir = (
            Path(session["dir"])
            if session and "dir" in session
            else Path(tempfile.gettempdir()) / f"feedio_mp_{upload_id}"
        )
        assembled_file = mp_dir / "assembled.bin"
        mime_type = (
            session.get("mime_type", "application/octet-stream")
            if session
            else "application/octet-stream"
        )

        def _assemble_and_upload() -> None:
            try:
                sorted_parts = sorted(
                    parts,
                    key=lambda p: int(p.get("part_number") or p.get("PartNumber", 0)),
                )
                with open(assembled_file, "wb") as out_f:
                    for p in sorted_parts:
                        num = p.get("part_number") or p.get("PartNumber")
                        part_file = mp_dir / f"part_{num}.bin"
                        if not part_file.exists():
                            raise FileNotFoundError(f"Missing multipart chunk {part_file}")
                        with open(part_file, "rb") as in_f:
                            while chunk := in_f.read(1024 * 1024):
                                out_f.write(chunk)

                file_id = storage_key_to_file_id(storage_key)
                with contextlib.suppress(AppwriteException):
                    self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

                input_file = InputFile.from_path(str(assembled_file))
                input_file.filename = Path(storage_key).name or "file.bin"
                input_file.mime_type = mime_type
                self._storage.create_file(
                    bucket_id=self._bucket,
                    file_id=file_id,
                    file=input_file,
                )
            finally:
                shutil.rmtree(mp_dir, ignore_errors=True)

        await asyncio.to_thread(_assemble_and_upload)

    async def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None:
        """Abort multipart session and remove local temp chunks."""
        session = self._multipart_sessions.pop(upload_id, None)
        mp_dir = (
            Path(session["dir"])
            if session and "dir" in session
            else Path(tempfile.gettempdir()) / f"feedio_mp_{upload_id}"
        )
        shutil.rmtree(mp_dir, ignore_errors=True)
