import json
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from feedio.modules.media.application.commands.complete_media_upload import CompleteMediaUpload
from feedio.modules.media.application.commands.complete_multipart_media_upload import (
    CompleteMultipartMediaUpload,
)
from feedio.modules.media.application.commands.process_media_transcode import ProcessMediaTranscode
from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder
from feedio.shared.infrastructure.persistence import utc_now


class MockStorageService(StorageService):
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}

    async def generate_presigned_upload_url(
        self, storage_key: str, mime_type: str, expires_in: int = 3600
    ) -> str:
        return f"https://mock-s3.local/upload/{storage_key}"

    async def generate_presigned_view_url(
        self, storage_key: str, expires_in: int = 7200
    ) -> str:
        return f"https://mock-s3.local/view/{storage_key}"

    async def verify_object_exists(self, storage_key: str) -> bool:
        return storage_key in self.files

    async def delete_object(self, storage_key: str) -> None:
        self.files.pop(storage_key, None)

    async def upload_bytes(
        self, storage_key: str, data: bytes, mime_type: str = "application/octet-stream"
    ) -> None:
        self.files[storage_key] = data

    async def get_object_bytes(self, storage_key: str) -> bytes:
        return self.files.get(storage_key, b"fake-video-content")

    async def create_multipart_upload(self, storage_key: str, mime_type: str) -> str:
        return "upload_123"

    async def generate_presigned_part_url(
        self, storage_key: str, upload_id: str, part_number: int, expires_in: int = 3600
    ) -> str:
        return f"https://mock-s3.local/part/{storage_key}?partNumber={part_number}"

    async def complete_multipart_upload(
        self, storage_key: str, upload_id: str, parts: list[dict[str, object]]
    ) -> None:
        self.files[storage_key] = b"multipart-video-content"

    async def abort_multipart_upload(self, storage_key: str, upload_id: str) -> None:
        pass


class MockMediaRepository(MediaRepository):
    def __init__(self) -> None:
        self.media_by_id: dict[UUID, MediaAsset] = {}

    async def create(self, media: MediaAsset) -> MediaAsset:
        self.media_by_id[media.id] = media
        return media

    async def get_by_id(
        self, organization_id: UUID, project_id: UUID, media_id: UUID
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
        self, organization_id: UUID, project_id: UUID, folder_id: UUID | None = None
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
        self, organization_id: UUID, project_id: UUID, media_id: UUID, status: str
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
        self, organization_id: UUID, project_id: UUID, media_id: UUID, title: str
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        return media

    async def move(
        self, organization_id: UUID, project_id: UUID, media_id: UUID, target_folder_id: UUID | None
    ) -> MediaAsset:
        media = await self.get_by_id(organization_id, project_id, media_id)
        if not media:
            raise MediaNotFoundError("Media not found")
        return media

    async def soft_delete(
        self, organization_id: UUID, project_id: UUID, media_id: UUID
    ) -> None:
        pass


class MockJobPublisher(MediaJobPublisher):
    def __init__(self) -> None:
        self.published_jobs: list[dict[str, object]] = []

    async def publish_transcode_job(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> None:
        self.published_jobs.append(
            {
                "organization_id": organization_id,
                "project_id": project_id,
                "media_id": media_id,
                "storage_key": storage_key,
                "filename": filename,
                "mime_type": mime_type,
            }
        )


@pytest.fixture
def mock_storage() -> MockStorageService:
    return MockStorageService()


@pytest.fixture
def mock_repository() -> MockMediaRepository:
    return MockMediaRepository()


@pytest.fixture
def mock_publisher() -> MockJobPublisher:
    return MockJobPublisher()


@pytest.mark.asyncio
async def test_complete_upload_publishes_transcode_job(
    mock_repository: MockMediaRepository,
    mock_storage: MockStorageService,
    mock_publisher: MockJobPublisher,
) -> None:
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Sample Video",
        filename="sample.mp4",
        file_size_bytes=1024 * 1024,
        mime_type="video/mp4",
        storage_key="org/proj/media/sample.mp4",
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await mock_repository.create(media)

    command = CompleteMediaUpload(
        repository=mock_repository,
        storage=mock_storage,
        job_publisher=mock_publisher,
    )
    updated = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
    )

    assert updated.status == "processing"
    assert len(mock_publisher.published_jobs) == 1
    job = mock_publisher.published_jobs[0]
    assert job["media_id"] == media_id
    assert job["storage_key"] == "org/proj/media/sample.mp4"


@pytest.mark.asyncio
async def test_complete_multipart_publishes_transcode_job(
    mock_repository: MockMediaRepository,
    mock_storage: MockStorageService,
    mock_publisher: MockJobPublisher,
) -> None:
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Large Cut",
        filename="prores.mov",
        file_size_bytes=5 * 1024 * 1024 * 1024,
        mime_type="video/quicktime",
        storage_key="org/proj/media/prores.mov",
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await mock_repository.create(media)

    command = CompleteMultipartMediaUpload(
        repository=mock_repository,
        storage=mock_storage,
        job_publisher=mock_publisher,
    )
    updated = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        upload_id="upload_123",
        parts=[{"part_number": 1, "etag": "etag-1"}],
    )

    assert updated.status == "processing"
    assert len(mock_publisher.published_jobs) == 1
    job = mock_publisher.published_jobs[0]
    assert job["media_id"] == media_id
    assert job["filename"] == "prores.mov"


@pytest.mark.asyncio
async def test_process_media_transcode_success(
    mock_repository: MockMediaRepository,
    mock_storage: MockStorageService,
) -> None:
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="ProRes Master",
        filename="master.mov",
        file_size_bytes=100_000,
        mime_type="video/quicktime",
        storage_key="org/proj/media/master.mov",
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await mock_repository.create(media)
    mock_storage.files[media.storage_key] = b"fake-video-stream-content"

    transcoder = FFmpegTranscoder(mock_storage)
    command = ProcessMediaTranscode(
        repository=mock_repository,
        transcoder=transcoder,
    )

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=media.storage_key,
        filename=media.filename,
        mime_type=media.mime_type,
    )

    assert result.status == "ready"
    assert result.fps is not None
    assert result.fps >= 23.9
    assert result.waveform_data is not None
    peaks = json.loads(result.waveform_data)
    assert isinstance(peaks, list)
    assert len(peaks) > 0


@pytest.mark.asyncio
async def test_transcoder_waveform_normalization(
    mock_storage: MockStorageService,
    tmp_path: Path,
) -> None:
    transcoder = FFmpegTranscoder(mock_storage)
    dummy_file = tmp_path / "test.mp4"
    dummy_file.write_bytes(b"dummy")

    waveform_json = await transcoder.extract_waveform(dummy_file, num_points=50)
    peaks = json.loads(waveform_json)
    assert len(peaks) == 50
    for p in peaks:
        assert 0.0 <= p <= 1.0


@pytest.mark.asyncio
async def test_transcoder_probe_fallback(
    mock_storage: MockStorageService,
    tmp_path: Path,
) -> None:
    transcoder = FFmpegTranscoder(mock_storage)
    transcoder._ffprobe_available = False
    dummy_file = tmp_path / "test.mp4"
    dummy_file.write_bytes(b"dummy")

    probe = await transcoder.probe_file(dummy_file)
    assert probe.fps == 24.0
    assert probe.width == 1920
    assert probe.height == 1080
