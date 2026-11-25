import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.bootstrap.config import Settings
from feedio.modules.media.infrastructure.appwrite_storage import AppwriteStorageService
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder
from feedio.modules.media.infrastructure.upload_token import (
    generate_upload_token,
    verify_upload_token,
)
from feedio.modules.media.presentation.upload_stream_router import (
    create_storage_upload_router,
)
from tests.media_fakes import InMemoryStorageService


@pytest.mark.asyncio
async def test_single_stream_upload_rejects_over_jwt_max_bytes_with_413(
    tmp_path: Path,
) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
        max_single_file_size_bytes=500,  # 500 bytes cap for test
        max_image_file_size_bytes=200,  # 200 bytes cap for images
    )
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    mini_app = FastAPI()
    mini_app.include_router(
        create_storage_upload_router(
            storage_service_provider=lambda: service,
            settings_provider=lambda: settings,
        ),
        prefix="/api/v1",
    )

    image_url = await service.generate_presigned_upload_url(
        f"organizations/o1/projects/p1/media/{uuid4()}/poster.png",
        "image/png",
    )
    token = image_url.split("token=", 1)[1]
    decoded = verify_upload_token(token, settings.auth_jwt_secret)
    assert decoded["max_bytes"] == 200

    async def _chunked_oversized_body():
        yield b"x" * 120
        yield b"y" * 120  # Total 240 > 200 -> must abort with 413

    async with AsyncClient(
        transport=ASGITransport(app=mini_app),
        base_url="http://localhost:8000",
    ) as client:
        resp = await client.put(image_url, content=_chunked_oversized_body())
        assert resp.status_code == 413
        mock_sdk.create_file.assert_not_called()


@pytest.mark.asyncio
async def test_multipart_part_stream_rejects_oversized_chunk_and_deletes_temp(
    tmp_path: Path,
) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
    )
    service = AppwriteStorageService(settings)
    mini_app = FastAPI()
    mini_app.include_router(
        create_storage_upload_router(
            storage_service_provider=lambda: service,
            settings_provider=lambda: settings,
        ),
        prefix="/api/v1",
    )

    upload_id = f"guardrail_{uuid4().hex}"
    token = generate_upload_token(
        secret=settings.auth_jwt_secret,
        storage_key="orgs/video.mp4",
        upload_type="multipart_part",
        upload_id=upload_id,
        part_number=1,
        max_bytes=100,
    )

    async def _oversized_part():
        yield b"a" * 70
        yield b"b" * 70  # 140 > 100

    async with AsyncClient(
        transport=ASGITransport(app=mini_app),
        base_url="http://localhost:8000",
    ) as client:
        resp = await client.put(
            f"/api/v1/storage/multipart/upload-part?token={token}",
            content=_oversized_part(),
        )
        assert resp.status_code == 413

    leaked_part = Path(tempfile.gettempdir()) / f"feedio_mp_{upload_id}" / "part_1.bin"
    assert not leaked_part.exists()


@pytest.mark.asyncio
async def test_ffmpeg_subprocess_timeout_kills_hung_process() -> None:
    storage = InMemoryStorageService()
    transcoder = FFmpegTranscoder(storage, timeout_seconds=1.0)
    transcoder._timeout_seconds = 0.05  # Fast 50ms timeout for unit test

    fake_proc = MagicMock()
    fake_proc.kill = MagicMock()
    fake_proc.wait = AsyncMock(return_value=-9)

    async def _hang_forever() -> tuple[bytes, bytes]:
        await asyncio.sleep(10.0)
        return b"", b""

    fake_proc.communicate = AsyncMock(side_effect=_hang_forever)

    with pytest.raises(TimeoutError, match="FFmpeg timed out"):
        await transcoder._run_proc_with_timeout(fake_proc, "generate_web_proxy_encode")

    fake_proc.kill.assert_called_once()
    fake_proc.wait.assert_awaited_once()
