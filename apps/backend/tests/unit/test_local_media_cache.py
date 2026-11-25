import time
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from appwrite.exception import AppwriteException
from httpx import ASGITransport, AsyncClient

from feedio.bootstrap.config import Settings
from feedio.modules.media.infrastructure.appwrite_storage import AppwriteStorageService
from feedio.modules.media.infrastructure.local_media_cache import (
    CachedMediaSlice,
    LocalMediaCache,
    parse_byte_range,
)
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder


def test_parse_byte_range_variants() -> None:
    assert parse_byte_range(None, 1000) == (0, 999, False)
    assert parse_byte_range("bytes=0-", 1000) == (0, 999, True)
    assert parse_byte_range("bytes=0-1", 1000) == (0, 1, True)
    assert parse_byte_range("bytes=100-499", 1000) == (100, 499, True)
    assert parse_byte_range("bytes=800-5000", 1000) == (800, 999, True)
    assert parse_byte_range("bytes=-200", 1000) == (800, 999, True)
    assert parse_byte_range("bytes=1000-1200", 1000) is None
    assert parse_byte_range("bytes=500-200", 1000) is None


def test_local_media_cache_lru_eviction(tmp_path: Path) -> None:
    # Budget floor in LocalMediaCache is 32 MB; override floor to test byte-exact LRU eviction
    cache = LocalMediaCache(cache_dir=tmp_path, max_bytes=32 * 1024 * 1024)
    cache._max_bytes = 100

    cache.put_bytes("pr_old", b"a" * 60, "video/mp4")
    time.sleep(0.02)
    cache.put_bytes("pr_new", b"b" * 60, "video/mp4")

    # Total 120 > 100 -> oldest entry ("pr_old") must be evicted while "pr_new" survives
    assert cache.get_bytes("pr_old") is None
    hit = cache.get_bytes("pr_new")
    assert hit is not None
    assert hit == (b"b" * 60, "video/mp4")


@pytest.mark.asyncio
async def test_nvme_cache_serves_http_206_range_without_upstream_call(tmp_path: Path) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    # Upload proxy -> warms NVMe cache automatically
    proxy_key = "organizations/o1/projects/p1/media/11111111-2222-3333-4444-555555555555/proxy.mp4"
    video_payload = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    await service.upload_bytes(proxy_key, video_payload, "video/mp4")

    file_id = "pr_11111111222233334444555555555555"
    sliced = service._local_cache.resolve_slice(file_id, "bytes=10-19")
    assert isinstance(sliced, CachedMediaSlice)
    assert sliced.start == 10
    assert sliced.end == 19
    assert sliced.is_partial is True

    # Test HTTP 206 through FastAPI router using custom settings_provider
    from fastapi import FastAPI

    from feedio.modules.media.presentation.upload_stream_router import (
        create_storage_upload_router,
    )

    mini_app = FastAPI()
    mini_app.include_router(
        create_storage_upload_router(
            storage_service_provider=lambda: service,
            settings_provider=lambda: settings,
        ),
        prefix="/api/v1",
    )

    async with AsyncClient(
        transport=ASGITransport(app=mini_app),
        base_url="http://localhost:8000",
    ) as client:
        resp = await client.get(
            f"/api/v1/storage/view/{file_id}",
            headers={"Range": "bytes=10-19"},
        )
        assert resp.status_code == 206
        assert resp.headers["x-cache"] == "HIT-NVME"
        assert resp.headers["content-range"] == f"bytes 10-19/{len(video_payload)}"
        assert resp.content == b"ABCDEFGHIJ"

        resp_416 = await client.get(
            f"/api/v1/storage/view/{file_id}",
            headers={"Range": "bytes=9999-10000"},
        )
        assert resp_416.status_code == 416


@pytest.mark.asyncio
async def test_appwrite_conflict_409_triggers_delete_and_retry(tmp_path: Path) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
        appwrite_endpoint="https://fra.cloud.appwrite.io/v1",
        appwrite_project_id="test-proj",
        appwrite_bucket_id="test-bucket",
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    mock_sdk.create_file.side_effect = [
        AppwriteException("Document already exists", code=409),
        {"$id": "th_123"},
    ]
    service._storage = mock_sdk

    await service.upload_bytes(
        "media/11111111-2222-3333-4444-555555555555/thumbnail.jpg",
        b"jpeg-bytes",
        "image/jpeg",
    )
    assert mock_sdk.create_file.call_count == 2
    mock_sdk.delete_file.assert_called_once()


def test_transcoder_skips_hls_by_default_on_appwrite(tmp_path: Path) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
    )
    appwrite_service = AppwriteStorageService(settings)
    transcoder = FFmpegTranscoder(appwrite_service)
    assert transcoder._enable_hls is False
    assert transcoder._ffmpeg_threads == "1"
