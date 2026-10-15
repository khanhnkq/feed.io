import asyncio
import json
from pathlib import Path
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from feedio.bootstrap.config import Settings
from feedio.modules.media.application.commands.process_media_transcode import (
    ProcessMediaTranscode,
)
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.infrastructure.appwrite_storage import (
    AppwriteStorageService,
    storage_key_to_file_id,
)
from feedio.modules.media.infrastructure.transcoder import (
    FFmpegTranscoder,
    MediaProbeResult,
)
from feedio.shared.infrastructure.persistence import utc_now
from tests.media_fakes import InMemoryMediaRepository


@pytest.mark.asyncio
async def test_appwrite_storage_download_to_file(tmp_path: Path) -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
        appwrite_api_key="test-key",
    )
    service = AppwriteStorageService(settings)
    dest_file = tmp_path / "downloaded_video.mp4"

    mock_resp = MagicMock()
    mock_resp.iter_content.return_value = [b"chunk_1_", b"chunk_2_", b"chunk_3"]
    mock_resp.__enter__.return_value = mock_resp

    with patch("requests.get", return_value=mock_resp) as mock_get:
        await service.download_to_file("media/video.mp4", dest_file)

        mock_get.assert_called_once()
        url = mock_get.call_args[0][0]
        assert "storage/buckets/test-bucket/files/" in url
        assert mock_get.call_args[1]["headers"]["X-Appwrite-Project"] == "test-proj"
        assert mock_get.call_args[1]["headers"]["X-Appwrite-Key"] == "test-key"
        assert dest_file.read_bytes() == b"chunk_1_chunk_2_chunk_3"


@pytest.mark.asyncio
async def test_appwrite_storage_upload_from_file(tmp_path: Path) -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    src_file = tmp_path / "proxy.mp4"
    src_file.write_bytes(b"encoded-mp4-stream")

    storage_key = "organizations/o1/projects/p1/media/11111111/proxy.mp4"
    await service.upload_from_file(storage_key, src_file, mime_type="video/mp4")

    mock_sdk.create_file.assert_called_once()
    kwargs = mock_sdk.create_file.call_args[1]
    assert kwargs["bucket_id"] == "test-bucket"
    assert kwargs["file_id"] == storage_key_to_file_id(storage_key)


@pytest.mark.asyncio
async def test_appwrite_worker_video_transcode_pipeline(tmp_path: Path) -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
        delete_original_after_transcode=True,
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    repository = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    raw_storage_key = f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/raw_video.mov"

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Raw 4K Footage",
        filename="raw_video.mov",
        file_size_bytes=500_000_000,
        mime_type="video/quicktime",
        storage_key=raw_storage_key,
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await repository.create(media)

    transcoder = FFmpegTranscoder(service)

    # Mock transcoder internal steps so we don't depend on system ffmpeg binary in unit test
    async def mock_download_to_file(storage_key: str, dest_path: Path) -> None:
        await asyncio.to_thread(dest_path.write_bytes, b"dummy-source-bytes")

    service.download_to_file = mock_download_to_file  # type: ignore[method-assign]

    async def mock_probe(file_path: Path) -> MediaProbeResult:
        return MediaProbeResult(
            duration_seconds=12.5,
            width=1920,
            height=1080,
            fps=30.0,
            codec="h264",
            has_video=True,
            has_audio=True,
        )

    transcoder.probe_file = mock_probe  # type: ignore[method-assign]

    async def mock_proxy(source: Path, output: Path, probe: MediaProbeResult | None = None) -> Path:
        await asyncio.to_thread(output.write_bytes, b"transcoded-proxy-mp4-data")
        return output

    transcoder.generate_web_proxy = mock_proxy  # type: ignore[method-assign]

    async def mock_thumb(source: Path, output: Path, timestamp_sec: float = 0.0) -> bool:
        await asyncio.to_thread(output.write_bytes, b"thumbnail-jpg-data")
        return True

    transcoder.extract_thumbnail = mock_thumb  # type: ignore[method-assign]

    async def mock_waveform(source: Path, num_points: int = 100) -> str:
        return json.dumps([0.1, 0.4, 0.8, 0.5])

    transcoder.extract_waveform = mock_waveform  # type: ignore[method-assign]

    # Execute Worker ProcessMediaTranscode Command
    command = ProcessMediaTranscode(
        repository=repository,
        transcoder=transcoder,
        storage=service,
        delete_original=True,
    )

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=raw_storage_key,
        filename="raw_video.mov",
        mime_type="video/quicktime",
    )

    # Assertions
    assert result.status == "ready"
    assert result.duration_seconds == 12.5
    assert result.width == 1920
    assert result.height == 1080
    assert result.fps == 30.0
    assert result.waveform_data == json.dumps([0.1, 0.4, 0.8, 0.5])

    # Original raw video must be purged from storage, and asset storage_key updated to proxy
    expected_raw_file_id = storage_key_to_file_id(raw_storage_key)
    mock_sdk.delete_file.assert_called_with(
        bucket_id="test-bucket",
        file_id=expected_raw_file_id,
    )
    expected_proxy_key = f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/proxy.mp4"
    assert result.storage_key == expected_proxy_key


@pytest.mark.asyncio
async def test_appwrite_worker_image_transcode_and_optimization() -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
        delete_original_after_transcode=True,
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    repository = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    raw_storage_key = f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/photo.png"

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Huge Photo",
        filename="huge_photo.png",
        file_size_bytes=15_000_000,
        mime_type="image/png",
        storage_key=raw_storage_key,
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await repository.create(media)

    transcoder = FFmpegTranscoder(service)

    async def mock_download_to_file(storage_key: str, dest_path: Path) -> None:
        await asyncio.to_thread(dest_path.write_bytes, b"dummy-png-bytes")

    service.download_to_file = mock_download_to_file  # type: ignore[method-assign]

    async def mock_optimize_image(source: Path, output: Path) -> bool:
        await asyncio.to_thread(output.write_bytes, b"optimized-webp-bytes")
        return True

    transcoder.optimize_image = mock_optimize_image  # type: ignore[method-assign]

    command = ProcessMediaTranscode(
        repository=repository,
        transcoder=transcoder,
        storage=service,
        delete_original=True,
    )

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=raw_storage_key,
        filename="huge_photo.png",
        mime_type="image/png",
    )

    assert result.status == "ready"
    expected_raw_file_id = storage_key_to_file_id(raw_storage_key)
    mock_sdk.delete_file.assert_called_with(
        bucket_id="test-bucket",
        file_id=expected_raw_file_id,
    )
    expected_opt_key = f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/optimized.webp"
    assert result.storage_key == expected_opt_key
    assert result.mime_type == "image/webp"
