import asyncio
import contextlib
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from feedio.bootstrap.config import Settings


class S3StorageService:
    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.garage_s3_bucket
        self._cors_origins = (
            settings.garage_s3_cors_origins
            if settings.garage_s3_cors_origins
            else (settings.cors_origins or ["*"])
        )
        self._cors_configured = False
        # Configure path-style addressing for Garage S3 compatibility
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

    async def ensure_bucket_cors(self) -> None:
        """Ensure CORS is configured on the media S3 bucket for direct web uploads."""

        def _set_cors() -> None:
            origins = self._cors_origins if self._cors_origins else ["*"]
            cors_rules = [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": [origin],
                    "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
                    "MaxAgeSeconds": 3600,
                }
                for origin in origins
            ]
            cors_configuration = {"CORSRules": cors_rules}
            with contextlib.suppress(Exception):
                self._client.put_bucket_cors(
                    Bucket=self._bucket, CORSConfiguration=cors_configuration
                )

        await asyncio.to_thread(_set_cors)

    async def generate_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600,
    ) -> str:
        """Generate a presigned PUT URL for direct client upload to Garage S3."""
        if not self._cors_configured:
            await self.ensure_bucket_cors()
            self._cors_configured = True

        def _generate() -> str:
            url: str = self._client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": storage_key,
                    "ContentType": mime_type,
                },
                ExpiresIn=expires_in,
            )
            return url

        return await asyncio.to_thread(_generate)

    async def generate_presigned_view_url(
        self,
        storage_key: str,
        expires_in: int = 7200,
    ) -> str:
        """Generate a presigned GET URL for streaming/downloading video from Garage S3."""

        def _generate() -> str:
            url: str = self._client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": storage_key,
                },
                ExpiresIn=expires_in,
            )
            return url

        return await asyncio.to_thread(_generate)

    async def verify_object_exists(self, storage_key: str) -> bool:
        """Verify that the object exists in Garage S3."""

        def _head() -> bool:
            try:
                self._client.head_object(Bucket=self._bucket, Key=storage_key)
                return True
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code in ("404", "NoSuchKey", "NotFound"):
                    return False
                # In development/test environments, if S3 storage is unreachable, fallback safely
                return False

        return await asyncio.to_thread(_head)

    async def delete_object(self, storage_key: str) -> None:
        """Delete an object from Garage S3."""

        def _delete() -> None:
            with contextlib.suppress(ClientError):
                self._client.delete_object(Bucket=self._bucket, Key=storage_key)

        await asyncio.to_thread(_delete)

    async def upload_bytes(
        self,
        storage_key: str,
        data: bytes,
        mime_type: str = "application/octet-stream",
    ) -> None:
        """Upload raw bytes to Garage S3."""

        def _put() -> None:
            self._client.put_object(
                Bucket=self._bucket,
                Key=storage_key,
                Body=data,
                ContentType=mime_type,
            )

        await asyncio.to_thread(_put)

    async def get_object_bytes(
        self,
        storage_key: str,
    ) -> bytes:
        """Retrieve raw object bytes from Garage S3."""

        def _get() -> bytes:
            response = self._client.get_object(
                Bucket=self._bucket,
                Key=storage_key,
            )
            body: bytes = response["Body"].read()
            return body

        return await asyncio.to_thread(_get)

    async def create_multipart_upload(
        self,
        storage_key: str,
        mime_type: str,
    ) -> str:
        """Initiate a multipart upload in Garage S3 and return the upload_id."""
        if not self._cors_configured:
            await self.ensure_bucket_cors()
            self._cors_configured = True

        def _create() -> str:
            response = self._client.create_multipart_upload(
                Bucket=self._bucket,
                Key=storage_key,
                ContentType=mime_type,
            )
            return str(response["UploadId"])

        return await asyncio.to_thread(_create)

    async def generate_presigned_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 3600,
    ) -> str:
        """Generate a presigned URL for uploading a specific part in a multipart upload."""
        if not self._cors_configured:
            await self.ensure_bucket_cors()
            self._cors_configured = True

        def _generate() -> str:
            url: str = self._client.generate_presigned_url(
                "upload_part",
                Params={
                    "Bucket": self._bucket,
                    "Key": storage_key,
                    "UploadId": upload_id,
                    "PartNumber": part_number,
                },
                ExpiresIn=expires_in,
            )
            return url

        return await asyncio.to_thread(_generate)

    async def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> None:
        """Complete a multipart upload by stitching together all uploaded parts."""

        def _complete() -> None:
            formatted_parts = [
                {"PartNumber": int(p["part_number"]), "ETag": str(p["etag"])} for p in parts
            ]
            self._client.complete_multipart_upload(
                Bucket=self._bucket,
                Key=storage_key,
                UploadId=upload_id,
                MultipartUpload={"Parts": formatted_parts},
            )

        await asyncio.to_thread(_complete)

    async def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None:
        """Abort a multipart upload and clean up all uploaded parts from Garage S3."""

        def _abort() -> None:
            with contextlib.suppress(ClientError):
                self._client.abort_multipart_upload(
                    Bucket=self._bucket,
                    Key=storage_key,
                    UploadId=upload_id,
                )

        await asyncio.to_thread(_abort)
