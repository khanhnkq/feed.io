import re
from dataclasses import dataclass
from uuid import UUID, uuid4

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import InvalidMediaTypeError
from feedio.shared.infrastructure.persistence import utc_now

SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
    "image/avif",
    "image/bmp",
    "image/tiff",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/heic",
    "image/heif",
}

SUPPORTED_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/mpeg",
    "video/ogg",
    "video/avi",
    "video/x-msvideo",
}

SUPPORTED_MIME_TYPES = SUPPORTED_VIDEO_MIME_TYPES | SUPPORTED_IMAGE_MIME_TYPES


def is_supported_media_type(mime_type: str) -> bool:
    normalized = mime_type.lower().strip()
    return (
        normalized in SUPPORTED_MIME_TYPES
        or normalized.startswith("video/")
        or normalized.startswith("image/")
    )


@dataclass(frozen=True, slots=True)
class PresignMediaUploadResult:
    media: MediaAsset
    upload_url: str
    thumbnail_upload_url: str | None = None


class PresignMediaUpload:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
    ) -> None:
        self._repository = repository
        self._storage = storage

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
    ) -> PresignMediaUploadResult:
        normalized_mime = mime_type.lower().strip()
        if not is_supported_media_type(normalized_mime):
            raise InvalidMediaTypeError(f"Unsupported media format: {mime_type}")

        # Sanitize filename
        safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename).strip("_")
        if not safe_filename:
            safe_filename = "asset.png" if normalized_mime.startswith("image/") else "video_cut.mp4"

        media_id = uuid4()
        storage_key = (
            f"organizations/{organization_id}/projects/{project_id}/"
            f"media/{media_id}/{safe_filename}"
        )

        # Generate presigned PUT URL for asset
        upload_url = await self._storage.generate_presigned_upload_url(
            storage_key=storage_key,
            mime_type=normalized_mime,
            expires_in=3600,
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
        return PresignMediaUploadResult(
            media=created_media,
            upload_url=upload_url,
            thumbnail_upload_url=thumbnail_upload_url,
        )
