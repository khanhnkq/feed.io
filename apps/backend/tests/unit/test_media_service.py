from uuid import UUID, uuid4

import pytest

from feedio.modules.media.application.commands.complete_media_upload import CompleteMediaUpload
from feedio.modules.media.application.commands.delete_media import DeleteMedia
from feedio.modules.media.application.commands.move_media import MoveMedia
from feedio.modules.media.application.commands.presign_media_upload import PresignMediaUpload
from feedio.modules.media.application.commands.update_media import UpdateMedia
from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.application.queries.get_media import GetMedia
from feedio.modules.media.application.queries.list_media import ListMedia
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import InvalidMediaTypeError, MediaNotFoundError
from feedio.shared.domain.pagination import Page
from feedio.shared.infrastructure.persistence import utc_now


class InMemoryStorageService(StorageService):
    def __init__(self) -> None:
        self.objects: set[str] = set()

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
        return storage_key in self.objects

    async def delete_object(self, storage_key: str) -> None:
        self.objects.discard(storage_key)

    async def upload_bytes(
        self,
        storage_key: str,
        data: bytes,
        mime_type: str = "application/octet-stream",
    ) -> None:
        self.objects.add(storage_key)

    async def get_object_bytes(
        self,
        storage_key: str,
    ) -> bytes:
        return b"mock-bytes"


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


@pytest.mark.asyncio
async def test_presign_media_upload_generates_url_and_draft_record() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    command = PresignMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()
    user_id = uuid4()

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=user_id,
        filename="Commercial_Cut_Final.mp4",
        file_size_bytes=52_428_800,
        mime_type="video/mp4",
    )

    assert result.media.status == "uploading"
    assert result.media.title == "Commercial_Cut_Final"
    assert result.media.filename == "Commercial_Cut_Final.mp4"
    assert "mock-s3.local/upload" in result.upload_url


@pytest.mark.asyncio
async def test_presign_media_rejects_unsupported_mime_type() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    command = PresignMediaUpload(repo, storage)

    with pytest.raises(InvalidMediaTypeError):
        await command.execute(
            organization_id=uuid4(),
            project_id=uuid4(),
            user_id=uuid4(),
            filename="malicious.exe",
            file_size_bytes=100,
            mime_type="application/x-msdownload",
        )


@pytest.mark.asyncio
async def test_complete_media_upload_marks_ready() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    presign_cmd = PresignMediaUpload(repo, storage)
    complete_cmd = CompleteMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()
    presign_result = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="Scene_01.mp4",
        file_size_bytes=1000,
        mime_type="video/mp4",
    )

    completed = await complete_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=presign_result.media.id,
    )
    assert completed.status == "ready"


@pytest.mark.asyncio
async def test_media_crud_and_location_filtering() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    presign_cmd = PresignMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()
    folder_id = uuid4()

    # Root media
    root_item = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="root_video.mp4",
        file_size_bytes=100,
        mime_type="video/mp4",
        folder_id=None,
    )

    # Folder media
    folder_item = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="folder_video.mp4",
        file_size_bytes=100,
        mime_type="video/mp4",
        folder_id=folder_id,
    )

    # Query root
    root_list = await ListMedia(repo).execute(org_id, proj_id, folder_id=None)
    assert len(root_list.items) == 1
    assert root_list.items[0].id == root_item.media.id

    # Query folder
    folder_list = await ListMedia(repo).execute(org_id, proj_id, folder_id=folder_id)
    assert len(folder_list.items) == 1
    assert folder_list.items[0].id == folder_item.media.id

    # Update title
    updated = await UpdateMedia(repo).execute(org_id, proj_id, root_item.media.id, "New Title")
    assert updated.title == "New Title"

    # Move to folder
    moved = await MoveMedia(repo).execute(org_id, proj_id, root_item.media.id, folder_id)
    assert moved.folder_id == folder_id

    # Get stream URL
    stream = await GetMedia(repo, storage).execute(org_id, proj_id, root_item.media.id)
    assert "mock-s3.local/view" in stream.stream_url

    # Soft delete
    await DeleteMedia(repo).execute(org_id, proj_id, root_item.media.id)
    after_delete = await ListMedia(repo).execute(org_id, proj_id, folder_id=folder_id)
    assert len(after_delete.items) == 1
    assert after_delete.items[0].id == folder_item.media.id


@pytest.mark.asyncio
async def test_presign_media_upload_with_thumbnail_and_duration() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    presign_cmd = PresignMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()
    result = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="trailer.mp4",
        file_size_bytes=5000,
        mime_type="video/mp4",
        duration_seconds=12.5,
        width=1920,
        height=1080,
        has_thumbnail=True,
    )

    assert result.media.duration_seconds == 12.5
    assert result.media.width == 1920
    assert result.media.height == 1080
    assert result.media.thumbnail_storage_key is not None
    assert "thumbnail.jpg" in result.media.thumbnail_storage_key
    assert result.thumbnail_upload_url is not None
    assert "thumbnail.jpg" in result.thumbnail_upload_url


@pytest.mark.asyncio
async def test_presign_and_complete_image_upload_direct_ready() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    presign_cmd = PresignMediaUpload(repo, storage)
    complete_cmd = CompleteMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    # PNG upload
    result = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="hero_banner.png",
        file_size_bytes=1024 * 500,
        mime_type="image/png",
        width=1920,
        height=1080,
    )
    assert result.media.mime_type == "image/png"
    assert result.media.status == "uploading"

    # Complete upload: image should transition directly to 'ready' without transcode job
    completed = await complete_cmd.execute(org_id, proj_id, result.media.id)
    assert completed.status == "ready"


@pytest.mark.asyncio
async def test_presign_svg_vector_upload() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    presign_cmd = PresignMediaUpload(repo, storage)
    complete_cmd = CompleteMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    result = await presign_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="logo.svg",
        file_size_bytes=12000,
        mime_type="image/svg+xml",
    )
    assert result.media.mime_type == "image/svg+xml"
    completed = await complete_cmd.execute(org_id, proj_id, result.media.id)
    assert completed.status == "ready"
