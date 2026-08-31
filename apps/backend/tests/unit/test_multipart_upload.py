from typing import Any
from uuid import UUID, uuid4

import pytest

from feedio.modules.media.application.commands.abort_multipart_upload import AbortMultipartUpload
from feedio.modules.media.application.commands.complete_multipart_media_upload import (
    CompleteMultipartMediaUpload,
)
from feedio.modules.media.application.commands.initiate_multipart_upload import (
    InitiateMultipartUpload,
)
from feedio.modules.media.application.commands.presign_multipart_parts import (
    PresignMultipartParts,
)
from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import (
    InvalidMediaTypeError,
    MediaNotFoundError,
    MediaUploadIncompleteError,
)
from feedio.shared.infrastructure.persistence import utc_now


class FakeMultipartStorageService(StorageService):
    def __init__(self) -> None:
        self.objects: set[str] = set()
        self.multipart_uploads: dict[str, dict[str, Any]] = {}
        self.aborted_uploads: set[str] = set()

    async def generate_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600,
    ) -> str:
        return f"https://mock-s3.local/upload/{storage_key}"

    async def generate_presigned_view_url(
        self,
        storage_key: str,
        expires_in: int = 7200,
    ) -> str:
        return f"https://mock-s3.local/view/{storage_key}"

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

    async def create_multipart_upload(
        self,
        storage_key: str,
        mime_type: str,
    ) -> str:
        upload_id = f"upload_id_{uuid4()}"
        self.multipart_uploads[upload_id] = {
            "storage_key": storage_key,
            "mime_type": mime_type,
            "parts": {},
        }
        return upload_id

    async def generate_presigned_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 3600,
    ) -> str:
        return (
            f"https://mock-s3.local/part/{storage_key}"
            f"?uploadId={upload_id}&partNumber={part_number}"
        )

    async def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> None:
        if upload_id not in self.multipart_uploads:
            raise RuntimeError("Upload ID not found")
        self.objects.add(storage_key)
        self.multipart_uploads[upload_id]["completed"] = True
        self.multipart_uploads[upload_id]["parts"] = parts

    async def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None:
        self.aborted_uploads.add(upload_id)
        self.multipart_uploads.pop(upload_id, None)


class FakeMediaRepository(MediaRepository):
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
    ) -> list[MediaAsset]:
        return [
            m
            for m in self.media_by_id.values()
            if m.organization_id == organization_id
            and m.project_id == project_id
            and m.folder_id == folder_id
            and m.deleted_at is None
        ]

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
            thumbnail_storage_key=media.thumbnail_storage_key,
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
        return await self.update_status(organization_id, project_id, media_id, status)

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
            thumbnail_storage_key=media.thumbnail_storage_key,
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
            thumbnail_storage_key=media.thumbnail_storage_key,
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
            thumbnail_storage_key=media.thumbnail_storage_key,
            created_at=media.created_at,
            updated_at=utc_now(),
            deleted_at=utc_now(),
        )
        self.media_by_id[media_id] = deleted


@pytest.mark.asyncio
async def test_initiate_multipart_upload_calculates_parts_and_creates_draft() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()
    user_id = uuid4()

    # 100 MB file with 20 MB parts -> 5 parts
    result = await initiate_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=user_id,
        filename="ProRes_Master_4K.mov",
        file_size_bytes=104_857_600,
        mime_type="video/quicktime",
        duration_seconds=30.0,
        width=3840,
        height=2160,
        has_thumbnail=True,
        part_size_bytes=20 * 1024 * 1024,
    )

    assert result.media.status == "uploading"
    assert result.media.title == "ProRes_Master_4K"
    assert result.media.width == 3840
    assert result.media.height == 2160
    assert result.part_size_bytes == 20 * 1024 * 1024
    assert result.total_parts == 5
    assert result.upload_id.startswith("upload_id_")
    assert result.thumbnail_upload_url is not None


@pytest.mark.asyncio
async def test_initiate_multipart_rejects_invalid_media_type() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)

    with pytest.raises(InvalidMediaTypeError):
        await initiate_cmd.execute(
            organization_id=uuid4(),
            project_id=uuid4(),
            user_id=uuid4(),
            filename="virus.exe",
            file_size_bytes=100_000,
            mime_type="application/octet-stream",
        )


@pytest.mark.asyncio
async def test_presign_multipart_parts_generates_presigned_urls() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)
    presign_parts_cmd = PresignMultipartParts(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    init_res = await initiate_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="RAW_Footage.mp4",
        file_size_bytes=50_000_000,
        mime_type="video/mp4",
    )

    parts_res = await presign_parts_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=init_res.media.id,
        upload_id=init_res.upload_id,
        part_numbers=[1, 2, 3],
    )

    assert len(parts_res) == 3
    assert parts_res[0].part_number == 1
    assert "partNumber=1" in parts_res[0].upload_url
    assert parts_res[1].part_number == 2
    assert "partNumber=2" in parts_res[1].upload_url
    assert parts_res[2].part_number == 3
    assert "partNumber=3" in parts_res[2].upload_url


@pytest.mark.asyncio
async def test_complete_multipart_upload_stitches_and_marks_ready() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)
    complete_multipart_cmd = CompleteMultipartMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    init_res = await initiate_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="Feature_Film_Reel.mov",
        file_size_bytes=100_000_000,
        mime_type="video/quicktime",
    )

    completed = await complete_multipart_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=init_res.media.id,
        upload_id=init_res.upload_id,
        parts=[
            {"part_number": 2, "etag": '"etag_part_2"'},
            {"part_number": 1, "etag": '"etag_part_1"'},
        ],
    )

    assert completed.status == "ready"
    assert storage.multipart_uploads[init_res.upload_id]["completed"] is True
    # Verify parts sorted in ascending order
    parts_recorded = storage.multipart_uploads[init_res.upload_id]["parts"]
    assert parts_recorded[0]["part_number"] == 1
    assert parts_recorded[1]["part_number"] == 2


@pytest.mark.asyncio
async def test_complete_multipart_upload_fails_when_parts_empty() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)
    complete_multipart_cmd = CompleteMultipartMediaUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    init_res = await initiate_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="Reel.mov",
        file_size_bytes=100_000_000,
        mime_type="video/quicktime",
    )

    with pytest.raises(MediaUploadIncompleteError):
        await complete_multipart_cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            media_id=init_res.media.id,
            upload_id=init_res.upload_id,
            parts=[],
        )


@pytest.mark.asyncio
async def test_abort_multipart_upload_cancels_storage_and_soft_deletes() -> None:
    repo = FakeMediaRepository()
    storage = FakeMultipartStorageService()
    initiate_cmd = InitiateMultipartUpload(repo, storage)
    abort_cmd = AbortMultipartUpload(repo, storage)

    org_id = uuid4()
    proj_id = uuid4()

    init_res = await initiate_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=uuid4(),
        filename="Cancelled_Upload.mov",
        file_size_bytes=100_000_000,
        mime_type="video/quicktime",
    )

    await abort_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=init_res.media.id,
        upload_id=init_res.upload_id,
    )

    assert init_res.upload_id in storage.aborted_uploads
    media_after_abort = await repo.get_by_id(org_id, proj_id, init_res.media.id)
    assert media_after_abort is None  # Soft deleted
