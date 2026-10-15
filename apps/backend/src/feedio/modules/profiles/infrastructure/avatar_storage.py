import asyncio
import contextlib
import hashlib
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

import boto3
from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.input_file import InputFile
from appwrite.services.storage import Storage
from botocore.config import Config
from botocore.exceptions import ClientError

from feedio.bootstrap.config import Settings
from feedio.modules.profiles.application.ports import AvatarStorage


class GarageAvatarStorage(AvatarStorage):
    """Avatar storage implementation backed by Garage S3."""

    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.garage_s3_bucket
        self._endpoint_url = settings.garage_s3_endpoint_url.rstrip("/")

        config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"max_attempts": 3, "mode": "standard"},
        )
        self._client: Any = boto3.client(
            "s3",
            endpoint_url=settings.garage_s3_endpoint_url,
            aws_access_key_id=settings.garage_s3_access_key or "replace-me",
            aws_secret_access_key=settings.garage_s3_secret_key or "replace-me",
            region_name=settings.garage_s3_region,
            config=config,
        )

    async def put_avatar(self, key: str, data: bytes, content_type: str) -> str:
        loop = asyncio.get_running_loop()

        def _upload() -> None:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )

        await loop.run_in_executor(None, _upload)
        filename = key.split("/")[-1]
        user_id_str = filename.rsplit(".", 1)[0]
        return f"/api/v1/profiles/{user_id_str}/avatar"

    async def get_avatar(self, key: str) -> tuple[bytes, str] | None:
        loop = asyncio.get_running_loop()

        def _get() -> tuple[bytes, str] | None:
            try:
                response = self._client.get_object(
                    Bucket=self._bucket,
                    Key=key,
                )
                data = response["Body"].read()
                content_type = response.get("ContentType", "image/jpeg")
                return data, content_type
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code in ("404", "NoSuchKey", "NotFound"):
                    return None
                raise

        return await loop.run_in_executor(None, _get)

    async def delete_avatar(self, key: str) -> None:
        loop = asyncio.get_running_loop()

        def _delete() -> None:
            with contextlib.suppress(ClientError):
                self._client.delete_object(
                    Bucket=self._bucket,
                    Key=key,
                )

        await loop.run_in_executor(None, _delete)


class AppwriteAvatarStorage(AvatarStorage):
    """Production avatar storage implementation backed by Appwrite Cloud Storage."""

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

    @staticmethod
    def _key_to_file_id(key: str) -> str:
        """Deterministically map an avatar key/path to an Appwrite file_id (<= 36 chars)."""
        cleaned = key.strip()
        if not cleaned:
            return f"av_{uuid4().hex[:32]}"

        uuids = re.findall(
            r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
            cleaned,
        )
        if uuids:
            user_hex = uuids[-1].replace("-", "").lower()
            return f"av_{user_hex}"[:35]

        filename = Path(cleaned).name
        stem = Path(filename).stem.replace("-", "").lower()
        if re.match(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,31}$", stem):
            return f"av_{stem}"[:35]

        hashed = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:32]
        return f"av_{hashed}"

    @staticmethod
    def _safe_filename(file_id: str, content_type: str) -> str:
        """Ensure file extension matches bucket policy (jpg, png)."""
        clean_type = content_type.split(";")[0].strip().lower()
        if clean_type in ("image/jpeg", "image/jpg"):
            return f"{file_id}.jpg"
        return f"{file_id}.png"

    @staticmethod
    def _detect_mime_type(data: bytes) -> str:
        """Infer mime type from image magic bytes if metadata is missing."""
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if data.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if data.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif"
        if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            return "image/webp"
        return "image/png"

    async def put_avatar(self, key: str, data: bytes, content_type: str) -> str:
        file_id = self._key_to_file_id(key)
        filename = self._safe_filename(file_id, content_type)
        loop = asyncio.get_running_loop()

        def _upload() -> None:
            # Delete existing file if present to avoid 409 Conflict
            with contextlib.suppress(Exception):
                self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

            input_file = InputFile.from_bytes(
                data,
                filename=filename,
                mime_type=content_type,
            )
            self._storage.create_file(
                bucket_id=self._bucket,
                file_id=file_id,
                file=input_file,
            )

        await loop.run_in_executor(None, _upload)
        raw_name = key.split("/")[-1]
        user_id_str = raw_name.rsplit(".", 1)[0]
        return f"/api/v1/profiles/{user_id_str}/avatar"

    async def get_avatar(self, key: str) -> tuple[bytes, str] | None:
        file_id = self._key_to_file_id(key)
        loop = asyncio.get_running_loop()

        def _get() -> tuple[bytes, str] | None:
            try:
                file_info = self._storage.get_file(self._bucket, file_id)
                data = self._storage.get_file_download(self._bucket, file_id)
                content_type = getattr(file_info, "mimetype", None)
                if not content_type and hasattr(file_info, "to_dict"):
                    d = file_info.to_dict()
                    content_type = d.get("mimeType") or d.get("mimetype")
                if not content_type:
                    content_type = self._detect_mime_type(data)
                return data, content_type
            except AppwriteException as exc:
                if exc.code == 404 or "not found" in str(exc).lower():
                    return None
                raise
            except Exception as exc:
                if "404" in str(exc):
                    return None
                raise

        return await loop.run_in_executor(None, _get)

    async def delete_avatar(self, key: str) -> None:
        file_id = self._key_to_file_id(key)
        loop = asyncio.get_running_loop()

        def _delete() -> None:
            with contextlib.suppress(Exception):
                self._storage.delete_file(bucket_id=self._bucket, file_id=file_id)

        await loop.run_in_executor(None, _delete)
