import hashlib
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from feedio.bootstrap.config import get_settings
from feedio.entrypoints.api import create_app
from feedio.modules.media.infrastructure.appwrite_storage import (
    AppwriteStorageService,
    storage_key_to_file_id,
)
from feedio.modules.media.infrastructure.upload_token import (
    InvalidUploadTokenError,
    generate_upload_token,
    verify_upload_token,
)


def test_upload_token_generation_and_validation() -> None:
    secret = "a" * 32
    key = "organizations/org-1/projects/proj-1/media/test-id/video.mp4"
    mime = "video/mp4"

    # Single token
    token = generate_upload_token(
        secret=secret,
        storage_key=key,
        mime_type=mime,
        expires_in=600,
        upload_type="single",
    )
    payload = verify_upload_token(token, secret)
    assert payload["sub"] == "storage_upload"
    assert payload["key"] == key
    assert payload["mime"] == mime
    assert payload["type"] == "single"

    # Multipart part token
    upload_id = "test-upload-id"
    part_token = generate_upload_token(
        secret=secret,
        storage_key=key,
        mime_type="application/octet-stream",
        expires_in=600,
        upload_type="multipart_part",
        upload_id=upload_id,
        part_number=3,
    )
    part_payload = verify_upload_token(part_token, secret)
    assert part_payload["type"] == "multipart_part"
    assert part_payload["upload_id"] == upload_id
    assert part_payload["part"] == 3

    # Tampered token fails
    with pytest.raises(InvalidUploadTokenError):
        verify_upload_token(token + "tampered", secret)

    # Wrong secret fails
    with pytest.raises(InvalidUploadTokenError):
        verify_upload_token(token, "wrong-secret-key-at-least-32-bytes-long!")

    # Expired token fails
    expired_token = generate_upload_token(
        secret=secret,
        storage_key=key,
        expires_in=-10,
    )
    with pytest.raises(InvalidUploadTokenError):
        verify_upload_token(expired_token, secret)


@pytest.mark.asyncio
async def test_streaming_upload_endpoint_single_file() -> None:
    settings = get_settings()
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    app = create_app(
        storage_service_provider=lambda: service,
    )

    media_id = uuid4()
    storage_key = f"organizations/org-1/projects/proj-1/media/{media_id}/clip.mp4"
    upload_url = await service.generate_presigned_upload_url(storage_key, "video/mp4")
    assert "/api/v1/storage/upload?token=" in upload_url

    file_bytes = b"Hello, this is video content streaming to Appwrite via backend proxy!"
    expected_etag = hashlib.md5(file_bytes).hexdigest()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://localhost:8000",
    ) as client:
        # PUT upload with streaming bytes
        resp = await client.put(upload_url, content=file_bytes)
        assert resp.status_code == 200
        assert resp.headers.get("etag") == f'"{expected_etag}"'
        assert resp.headers.get("x-feedio-file-id") == storage_key_to_file_id(storage_key)
        assert resp.json()["status"] == "uploaded"
        assert resp.json()["bytes"] == len(file_bytes)

        # Verify Appwrite SDK received the file upload call
        mock_sdk.create_file.assert_called_once()
        call_kwargs = mock_sdk.create_file.call_args[1]
        assert call_kwargs["bucket_id"] == settings.appwrite_bucket_id
        assert call_kwargs["file_id"] == storage_key_to_file_id(storage_key)


@pytest.mark.asyncio
async def test_multipart_part_upload_and_assembly_flow() -> None:
    settings = get_settings()
    service = AppwriteStorageService(settings)
    mock_sdk = MagicMock()
    service._storage = mock_sdk

    app = create_app(
        storage_service_provider=lambda: service,
    )

    media_id = uuid4()
    storage_key = f"organizations/org-1/projects/proj-1/media/{media_id}/movie.mp4"

    # Step 1: Initiate multipart upload
    upload_id = await service.create_multipart_upload(storage_key, "video/mp4")
    assert upload_id in service._multipart_sessions

    # Step 2: Presign parts 1 and 2
    part1_url = await service.generate_presigned_part_url(storage_key, upload_id, part_number=1)
    part2_url = await service.generate_presigned_part_url(storage_key, upload_id, part_number=2)

    chunk1 = b"Chunk 1: First 10 megabytes of high definition video stream..."
    chunk2 = b"Chunk 2: Second 10 megabytes of high definition video stream..."

    etag1 = hashlib.md5(chunk1).hexdigest()
    etag2 = hashlib.md5(chunk2).hexdigest()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://localhost:8000",
    ) as client:
        # PUT part 1
        resp1 = await client.put(part1_url, content=chunk1)
        assert resp1.status_code == 200
        assert resp1.headers.get("etag") == f'"{etag1}"'
        assert resp1.json()["part_number"] == 1

        # PUT part 2
        resp2 = await client.put(part2_url, content=chunk2)
        assert resp2.status_code == 200
        assert resp2.headers.get("etag") == f'"{etag2}"'
        assert resp2.json()["part_number"] == 2

    # Step 3: Complete multipart upload
    completed_parts = [
        {"part_number": 1, "etag": etag1},
        {"part_number": 2, "etag": etag2},
    ]
    await service.complete_multipart_upload(storage_key, upload_id, completed_parts)
    assert upload_id not in service._multipart_sessions

    # Verify that Appwrite SDK create_file was invoked with assembled file
    mock_sdk.create_file.assert_called_once()
    call_kwargs = mock_sdk.create_file.call_args[1]
    assert call_kwargs["bucket_id"] == settings.appwrite_bucket_id
    assert call_kwargs["file_id"] == storage_key_to_file_id(storage_key)


@pytest.mark.asyncio
async def test_invalid_or_expired_upload_token_rejected() -> None:
    settings = get_settings()
    service = AppwriteStorageService(settings)
    app = create_app(
        storage_service_provider=lambda: service,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://localhost:8000",
    ) as client:
        # No token
        resp = await client.put("/api/v1/storage/upload", content=b"data")
        assert resp.status_code == 422  # Query param required

        # Invalid token
        resp = await client.put("/api/v1/storage/upload?token=invalid.jwt.token", content=b"data")
        assert resp.status_code == 403

        # Expired token
        expired_token = generate_upload_token(
            secret=settings.auth_jwt_secret,
            storage_key="test-key",
            expires_in=-10,
        )
        resp = await client.put(f"/api/v1/storage/upload?token={expired_token}", content=b"data")
        assert resp.status_code == 403
