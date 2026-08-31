import math
import re
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from feedio.modules.media.application.commands.presign_media_upload import is_supported_media_type
from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import InvalidMediaTypeError
from feedio.shared.infrastructure.persistence import utc_now

DEFAULT_PART_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
MIN_PART_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB (S3 min limit)


@dataclass(frozen=True, slots=True)
class InitiateMultipartUploadResult:
    media: MediaAsset
    upload_id: str
    part_size_bytes: int
    total_parts: int
    thumbnail_upload_url: str | None = None


class InitiateMultipartUpload:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
        quota_service: Any | None = None,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._quota_service = quota_service

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID | None,
        filename: str,
        file_size_bytes: int,
        mime_type: str,
        folder_id: UUID | None = None,
        duration_seconds: float | None = None,
        width: int | None = None,
        height: int | None = None,
        has_thumbnail: bool = False,
        part_size_bytes: int = DEFAULT_PART_SIZE_BYTES,
    ) -> InitiateMultipartUploadResult:
        if self._quota_service is not None:
            await self._quota_service.check_upload_allowed(organization_id, file_size_bytes)
        normalized_mime = mime_type.lower().strip()
        if not is_supported_media_type(normalized_mime):
            raise InvalidMediaTypeError(f"Unsupported media format: {mime_type}")

        # Ensure part size respects S3 minimum (except when total file is smaller than min part)
        effective_part_size = max(MIN_PART_SIZE_BYTES, part_size_bytes)
        total_parts = max(1, math.ceil(file_size_bytes / effective_part_size))

        safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename).strip("_")
        if not safe_filename:
            safe_filename = "asset.png" if normalized_mime.startswith("image/") else "video_cut.mp4"

        media_id = uuid4()
        storage_key = (
            f"organizations/{organization_id}/projects/{project_id}/"
            f"media/{media_id}/{safe_filename}"
        )

        upload_id = await self._storage.create_multipart_upload(
            storage_key=storage_key,
            mime_type=normalized_mime,
        )

        thumbnail_storage_key: str | None = None
        thumbnail_upload_url: str | None = None

        if has_thumbnail:
            thumbnail_storage_key = (
                f"organizations/{organization_id}/projects/{project_id}/"
                f"media/{media_id}/thumbnail.jpg"
            )
            thumbnail_upload_url = await self._storage.generate_presigned_upload_url(
                storage_key=thumbnail_storage_key,
                mime_type="image/jpeg",
                expires_in=3600,
            )

        now = utc_now()
        title = filename.rsplit(".", 1)[0] if "." in filename else filename

        media = MediaAsset(
            id=media_id,
            organization_id=organization_id,
            project_id=project_id,
            folder_id=folder_id,
            created_by_user_id=user_id,
            title=title,
            filename=safe_filename,
            file_size_bytes=file_size_bytes,
            mime_type=normalized_mime,
            storage_key=storage_key,
            status="uploading",
            duration_seconds=duration_seconds,
            width=width,
            height=height,
            thumbnail_storage_key=thumbnail_storage_key,
            created_at=now,
            updated_at=now,
        )

        created_media = await self._repository.create(media)
        return InitiateMultipartUploadResult(
            media=created_media,
            upload_id=upload_id,
            part_size_bytes=effective_part_size,
            total_parts=total_parts,
            thumbnail_upload_url=thumbnail_upload_url,
        )
