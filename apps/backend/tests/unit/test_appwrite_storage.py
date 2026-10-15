from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from appwrite.exception import AppwriteException

from feedio.bootstrap.config import Settings
from feedio.modules.media.application.ports import StorageService
from feedio.modules.media.infrastructure.appwrite_storage import (
    AppwriteStorageService,
    storage_key_to_file_id,
)


def test_storage_key_to_file_id_length_and_format() -> None:
    media_id = uuid4()
    org_id = uuid4()
    proj_id = uuid4()

    test_keys = [
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/original.mp4",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/thumbnail.jpg",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/optimized.webp",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/proxy.mp4",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/waveform.json",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/filmstrip.jpg",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/filmstrip.vtt",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/hls/master.m3u8",
        f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/hls/segment_001.ts",
        "custom_flat_image.png",
        "already-valid-standalone-id-123",
    ]

    for key in test_keys:
        file_id = storage_key_to_file_id(key)
        assert len(file_id) <= 36, f"File ID {file_id} exceeds 36 chars"
        assert file_id[0].isalnum(), f"File ID {file_id} must start with alphanumeric"
        for ch in file_id:
            assert ch.isalnum() or ch in "._-", f"Invalid char {ch} in {file_id}"

    # Semantic prefix assertions
    assert storage_key_to_file_id(f"media/{media_id}/thumbnail.jpg").startswith("th_")
    assert storage_key_to_file_id(f"media/{media_id}/proxy.mp4").startswith("pr_")
    assert storage_key_to_file_id(f"media/{media_id}/waveform.json").startswith("wf_")
    assert storage_key_to_file_id(f"media/{media_id}/original.mp4").startswith("rw_")
    assert storage_key_to_file_id(f"media/{media_id}/filmstrip.jpg").startswith("fs_")
    assert storage_key_to_file_id(f"media/{media_id}/filmstrip.vtt").startswith("vt_")
    assert storage_key_to_file_id(f"media/{media_id}/hls/master.m3u8").startswith("hl_")


@pytest.mark.asyncio
async def test_appwrite_storage_presigned_urls() -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
        appwrite_api_key="test-key",
    )
    service = AppwriteStorageService(settings)

    media_id = uuid4()
    video_key = f"media/{media_id}/proxy.mp4"
    image_key = f"media/{media_id}/thumbnail.jpg"

    # Upload URL
    upload_url = await service.generate_presigned_upload_url(video_key, "video/mp4")
    assert "/api/v1/storage/upload?token=" in upload_url

    # Video View URL
    video_view_url = await service.generate_presigned_view_url(video_key)
    file_id_video = storage_key_to_file_id(video_key)
    assert (
        video_view_url
        == f"{settings.api_base_url}/api/v1/storage/view/{file_id_video}"
    )

    # Image Preview URL (WebP transform CDN)
    image_view_url = await service.generate_presigned_view_url(image_key)
    file_id_image = storage_key_to_file_id(image_key)
    assert (
        image_view_url
        == f"{settings.api_base_url}/api/v1/storage/preview/{file_id_image}"
    )



@pytest.mark.asyncio
async def test_appwrite_storage_crud_operations() -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
        appwrite_api_key="test-key",
    )
    service = AppwriteStorageService(settings)

    mock_sdk_storage = MagicMock()
    service._storage = mock_sdk_storage

    key = "media/11111111-2222-3333-4444-555555555555/thumbnail.jpg"
    file_id = storage_key_to_file_id(key)

    # Test upload_bytes
    mock_sdk_storage.create_file.return_value = {"$id": file_id}
    await service.upload_bytes(key, b"fake-jpeg-content", "image/jpeg")
    mock_sdk_storage.create_file.assert_called_once()
    assert mock_sdk_storage.create_file.call_args[1]["bucket_id"] == "test-bucket"
    assert mock_sdk_storage.create_file.call_args[1]["file_id"] == file_id

    # Test get_object_bytes
    mock_sdk_storage.get_file_download.return_value = b"downloaded-bytes"
    downloaded = await service.get_object_bytes(key)
    assert downloaded == b"downloaded-bytes"
    mock_sdk_storage.get_file_download.assert_called_once_with(
        bucket_id="test-bucket", file_id=file_id
    )

    # Test verify_object_exists (True)
    mock_sdk_storage.get_file.return_value = {"$id": file_id}
    assert await service.verify_object_exists(key) is True

    # Test verify_object_exists (False on 404)
    mock_sdk_storage.get_file.side_effect = AppwriteException("Not found", code=404)
    assert await service.verify_object_exists(key) is False

    # Test delete_object
    await service.delete_object(key)
    mock_sdk_storage.delete_file.assert_called_with(bucket_id="test-bucket", file_id=file_id)


@pytest.mark.asyncio
async def test_appwrite_storage_multipart_lifecycle() -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
    )
    service = AppwriteStorageService(settings)
    mock_sdk_storage = MagicMock()
    service._storage = mock_sdk_storage

    key = "media/11111111-2222-3333-4444-555555555555/video.mp4"
    upload_id = await service.create_multipart_upload(key, "video/mp4")
    assert upload_id is not None
    assert upload_id in service._multipart_sessions

    part_url = await service.generate_presigned_part_url(key, upload_id, part_number=1)
    assert "/api/v1/storage/multipart/upload-part?token=" in part_url

    await service.complete_multipart_upload(key, upload_id, parts=[])
    assert upload_id not in service._multipart_sessions

    upload_id_2 = await service.create_multipart_upload(key, "video/mp4")
    await service.abort_multipart_upload(key, upload_id_2)
    assert upload_id_2 not in service._multipart_sessions


def test_storage_service_protocol_structural_subtyping() -> None:
    settings = Settings(
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
    )
    service = AppwriteStorageService(settings)

    # Validate that all methods from StorageService protocol exist on AppwriteStorageService
    for method_name in dir(StorageService):
        if not method_name.startswith("_"):
            assert hasattr(
                service, method_name
            ), f"Missing method {method_name} in AppwriteStorageService"
            assert callable(getattr(service, method_name))


def test_safe_appwrite_filename_mapping() -> None:
    from feedio.modules.media.infrastructure.appwrite_storage import _safe_appwrite_filename

    # Standard allowed extensions kept intact
    assert _safe_appwrite_filename("video.mp4", "video/mp4") == "video.mp4"
    assert _safe_appwrite_filename("image.png", "image/png") == "image.png"
    assert _safe_appwrite_filename("photo.jpg", "image/jpeg") == "photo.jpg"

    # Non-standard video formats mapped to .mp4
    assert (
        _safe_appwrite_filename("ScreenRecording.mov", "video/quicktime")
        == "ScreenRecording.mp4"
    )
    assert _safe_appwrite_filename("movie.mkv", "video/x-matroska") == "movie.mp4"
    assert _safe_appwrite_filename("clip.webm", "video/webm") == "clip.mp4"
    assert _safe_appwrite_filename("video.avi", "video/x-msvideo") == "video.mp4"

    # Non-standard image formats mapped to .png
    assert _safe_appwrite_filename("photo.jpeg", "image/jpeg") == "photo.png"
    assert _safe_appwrite_filename("banner.webp", "image/webp") == "banner.png"
    assert _safe_appwrite_filename("anim.gif", "image/gif") == "anim.png"

