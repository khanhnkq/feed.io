from datetime import datetime
from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.shared.domain.pagination import Page
from feedio.shared.infrastructure.persistence import utc_now


class InMemoryStorageService(StorageService):
    def __init__(self) -> None:
        self.objects: set[str] = set()
        self.files: dict[str, bytes] = {}

    async def generate_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600,
    ) -> str:
        return f"https://mock-s3.local/upload/{storage_key}?expires={expires_in}&mime={mime_type}"

    async def generate_presigned_view_url(
        self,
        storage_key: str,
        expires_in: int = 7200,
    ) -> str:
        return f"https://mock-s3.local/view/{storage_key}?expires={expires_in}"

    async def verify_object_exists(self, storage_key: str) -> bool:
        return storage_key in self.objects or storage_key in self.files

    async def delete_object(self, storage_key: str) -> None:
        self.objects.discard(storage_key)
        self.files.pop(storage_key, None)

    async def upload_bytes(
        self,
        storage_key: str,
        data: bytes,
        mime_type: str = "application/octet-stream",
    ) -> None:
        self.objects.add(storage_key)
        self.files[storage_key] = data

    async def get_object_bytes(
        self,
        storage_key: str,
    ) -> bytes:
        return self.files.get(storage_key, b"mock-bytes")

    async def create_multipart_upload(
        self,
        storage_key: str,
        mime_type: str,
    ) -> str:
        return "mock-upload-id"

    async def generate_presigned_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 3600,
    ) -> str:
        return f"https://mock-s3.local/upload/{storage_key}?partNumber={part_number}&uploadId={upload_id}"

    async def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict],
    ) -> None:
        self.objects.add(storage_key)

    async def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None:
        self.objects.discard(storage_key)


class InMemoryMediaRepository(MediaRepository):
    def __init__(self) -> None:
        self.media_by_id: dict[UUID, MediaAsset] = {}

    async def create(self, media: MediaAsset) -> MediaAsset:
        self.media_by_id[media.id] = media
        return media

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset | None:
        media = self.media_by_id.get(media_id)
        if (
            media
            and media.organization_id == organization_id
            and media.project_id == project_id
            and media.deleted_at is None
        ):
            return media
        return None

    async def list_by_location(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[MediaAsset]:
        items = [
            m
            for m in self.media_by_id.values()
            if m.organization_id == organization_id
            and m.project_id == project_id
            and m.folder_id == folder_id
            and m.deleted_at is None
        ]
        return Page(items=items[:limit], next_cursor=None, has_more=len(items) > limit)

    async def update_status(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        updated = MediaAsset(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=media.folder_id,
            created_by_user_id=media.created_by_user_id,
            title=media.title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=status,
            duration_seconds=media.duration_seconds,
            width=media.width,
            height=media.height,
            fps=media.fps,
            thumbnail_storage_key=media.thumbnail_storage_key,
            hls_storage_key=media.hls_storage_key,
            waveform_data=media.waveform_data,
            error_message=media.error_message,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=media.deleted_at,
        )
        self.media_by_id[media_id] = updated
        return updated

    async def update_transcode_result(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
        duration_seconds: float | None = None,
        width: int | None = None,
        height: int | None = None,
        fps: float | None = None,
        thumbnail_storage_key: str | None = None,
        hls_storage_key: str | None = None,
        proxy_storage_key: str | None = None,
        filmstrip_storage_key: str | None = None,
        filmstrip_vtt_storage_key: str | None = None,
        waveform_data: str | None = None,
        error_message: str | None = None,
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        updated = MediaAsset(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=media.folder_id,
            created_by_user_id=media.created_by_user_id,
            title=media.title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=status,
            duration_seconds=duration_seconds
            if duration_seconds is not None
            else media.duration_seconds,
            width=width if width is not None else media.width,
            height=height if height is not None else media.height,
            fps=fps if fps is not None else media.fps,
            thumbnail_storage_key=thumbnail_storage_key
            if thumbnail_storage_key is not None
            else media.thumbnail_storage_key,
            hls_storage_key=hls_storage_key
            if hls_storage_key is not None
            else media.hls_storage_key,
            proxy_storage_key=proxy_storage_key
            if proxy_storage_key is not None
            else media.proxy_storage_key,
            filmstrip_storage_key=filmstrip_storage_key
            if filmstrip_storage_key is not None
            else media.filmstrip_storage_key,
            filmstrip_vtt_storage_key=filmstrip_vtt_storage_key
            if filmstrip_vtt_storage_key is not None
            else media.filmstrip_vtt_storage_key,
            waveform_data=waveform_data if waveform_data is not None else media.waveform_data,
            error_message=error_message if error_message is not None else media.error_message,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=media.deleted_at,
        )
        self.media_by_id[media_id] = updated
        return updated

    async def update_metadata(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        title: str,
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        updated = MediaAsset(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=media.folder_id,
            created_by_user_id=media.created_by_user_id,
            title=title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=media.status,
            duration_seconds=media.duration_seconds,
            width=media.width,
            height=media.height,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=media.deleted_at,
        )
        self.media_by_id[media_id] = updated
        return updated

    async def move(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        target_folder_id: UUID | None,
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        updated = MediaAsset(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=target_folder_id,
            created_by_user_id=media.created_by_user_id,
            title=media.title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=media.status,
            duration_seconds=media.duration_seconds,
            width=media.width,
            height=media.height,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=media.deleted_at,
        )
        self.media_by_id[media_id] = updated
        return updated

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> None:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        deleted = MediaAsset(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=media.folder_id,
            created_by_user_id=media.created_by_user_id,
            title=media.title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=media.status,
            duration_seconds=media.duration_seconds,
            width=media.width,
            height=media.height,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=utc_now(),
        )
        self.media_by_id[media_id] = deleted

    async def get_organization_storage_usage_bytes(
        self,
        organization_id: UUID,
    ) -> int:
        return sum(
            m.file_size_bytes
            for m in self.media_by_id.values()
            if m.organization_id == organization_id and m.deleted_at is None
        )

    async def list_incomplete_multipart_uploads(
        self,
        older_than: datetime,
    ) -> list[MediaAsset]:
        return [
            m
            for m in self.media_by_id.values()
            if m.status == "uploading" and m.created_at < older_than and m.deleted_at is None
        ]

    async def list_versions(
        self,
        organization_id: UUID,
        project_id: UUID,
        version_group_id: UUID,
    ) -> list[MediaAsset]:
        return sorted(
            [
                m
                for m in self.media_by_id.values()
                if m.organization_id == organization_id
                and m.project_id == project_id
                and m.version_group_id == version_group_id
                and m.deleted_at is None
            ],
            key=lambda x: x.version_number,
        )
