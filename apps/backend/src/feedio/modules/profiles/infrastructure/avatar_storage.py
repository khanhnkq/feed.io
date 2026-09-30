import asyncio
import contextlib
from typing import Any

import boto3
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
