"""Unit tests for dynamic organization storage quota checks."""

from uuid import uuid4

import pytest

from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    PRO_100GB_STORAGE_QUOTA_BYTES,
)
from feedio.modules.media.domain.errors import StorageQuotaExceededError
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from tests.media_fakes import InMemoryMediaRepository


@pytest.mark.asyncio
async def test_dynamic_quota_uses_free_tier_by_default() -> None:
    repo = InMemoryMediaRepository()
    quota_svc = StorageQuotaService(repository=repo)
    org_id = uuid4()

    # Default quota is 5 GB
    assert await quota_svc.get_storage_quota(org_id) == DEFAULT_FREE_STORAGE_QUOTA_BYTES

    # 4.5 GB upload is allowed
    await quota_svc.check_upload_allowed(org_id, int(4.5 * 1024 * 1024 * 1024))

    # 5.5 GB upload exceeds Free tier quota
    with pytest.raises(StorageQuotaExceededError):
        await quota_svc.check_upload_allowed(org_id, int(5.5 * 1024 * 1024 * 1024))


@pytest.mark.asyncio
async def test_dynamic_quota_honors_pro_tier_quota() -> None:
    repo = InMemoryMediaRepository()
    quota_svc = StorageQuotaService(repository=repo)
    org_id = uuid4()

    # Organization upgraded to 100 GB Pro tier
    repo.quotas_by_org[org_id] = PRO_100GB_STORAGE_QUOTA_BYTES

    assert await quota_svc.get_storage_quota(org_id) == PRO_100GB_STORAGE_QUOTA_BYTES

    # Uploading 20 GB is well within the 100 GB Pro quota
    await quota_svc.check_upload_allowed(org_id, 20 * 1024 * 1024 * 1024)

    # Add existing 90 GB usage
    from datetime import UTC, datetime
    from feedio.modules.media.domain.entities import MediaAsset

    media = MediaAsset(
        id=uuid4(),
        organization_id=org_id,
        project_id=uuid4(),
        folder_id=None,
        created_by_user_id=None,
        title="big_render.mov",
        filename="big_render.mov",
        file_size_bytes=90 * 1024 * 1024 * 1024,
        mime_type="video/quicktime",
        storage_key="media/test/big_render.mov",
        status="ready",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    repo.media_by_id[media.id] = media

    # Trying to upload another 15 GB (within 50 GB single file limit, but 90 + 15 = 105 GB > 100 GB org quota)
    with pytest.raises(StorageQuotaExceededError):
        await quota_svc.check_upload_allowed(org_id, 15 * 1024 * 1024 * 1024)
