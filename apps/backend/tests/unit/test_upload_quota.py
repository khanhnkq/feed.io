from uuid import uuid4

import pytest

from feedio.modules.media.application.commands.initiate_multipart_upload import (
    InitiateMultipartUpload,
)
from feedio.modules.media.application.commands.presign_media_upload import PresignMediaUpload
from feedio.modules.media.domain.errors import FileTooLargeError, StorageQuotaExceededError
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


@pytest.mark.asyncio
async def test_quota_service_allows_upload_within_limit() -> None:
    repo = InMemoryMediaRepository()
    quota_svc = StorageQuotaService(
        repository=repo,
        default_quota_bytes=100 * 1024 * 1024,  # 100 MB
        max_single_file_bytes=50 * 1024 * 1024,  # 50 MB
    )
    org_id = uuid4()
    # 20 MB file should succeed
    await quota_svc.check_upload_allowed(org_id, 20 * 1024 * 1024)


@pytest.mark.asyncio
async def test_quota_service_rejects_file_exceeding_max_file_size() -> None:
    repo = InMemoryMediaRepository()
    quota_svc = StorageQuotaService(
        repository=repo,
        default_quota_bytes=100 * 1024 * 1024,
        max_single_file_bytes=50 * 1024 * 1024,
    )
    org_id = uuid4()
    with pytest.raises(FileTooLargeError):
        await quota_svc.check_upload_allowed(org_id, 60 * 1024 * 1024)


@pytest.mark.asyncio
async def test_quota_service_rejects_when_org_quota_exceeded() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    quota_svc = StorageQuotaService(
        repository=repo,
        default_quota_bytes=50 * 1024 * 1024,  # 50 MB
        max_single_file_bytes=50 * 1024 * 1024,
    )
    org_id = uuid4()
    proj_id = uuid4()

    # Upload 40 MB file first
    cmd = PresignMediaUpload(repo, storage, quota_service=quota_svc)
    await cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        user_id=None,
        filename="first_file.mp4",
        file_size_bytes=40 * 1024 * 1024,
        mime_type="video/mp4",
    )

    # Trying to upload another 20 MB file should exceed 50 MB quota
    with pytest.raises(StorageQuotaExceededError):
        await quota_svc.check_upload_allowed(org_id, 20 * 1024 * 1024)


@pytest.mark.asyncio
async def test_initiate_multipart_checks_quota() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    quota_svc = StorageQuotaService(
        repository=repo,
        default_quota_bytes=30 * 1024 * 1024,
        max_single_file_bytes=30 * 1024 * 1024,
    )
    org_id = uuid4()
    proj_id = uuid4()

    cmd = InitiateMultipartUpload(repo, storage, quota_service=quota_svc)
    with pytest.raises(FileTooLargeError):
        await cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            user_id=None,
            filename="large_video.mp4",
            file_size_bytes=50 * 1024 * 1024,
            mime_type="video/mp4",
        )
