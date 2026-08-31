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
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


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
def mock_storage() -> InMemoryStorageService:
    return InMemoryStorageService()


@pytest.fixture
def mock_repository() -> InMemoryMediaRepository:
    return InMemoryMediaRepository()


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
