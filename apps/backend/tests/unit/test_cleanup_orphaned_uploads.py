from datetime import timedelta
from uuid import uuid4

import pytest

from feedio.modules.media.application.commands.cleanup_orphaned_uploads import (
    CleanupOrphanedUploads,
)
from feedio.modules.media.domain.entities import MediaAsset
from feedio.shared.infrastructure.persistence import utc_now
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


@pytest.mark.asyncio
async def test_cleanup_orphaned_uploads_cleans_stale_records() -> None:
    repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()
    org_id = uuid4()
    proj_id = uuid4()

    # Create an old uploading record (>24h old)
    old_time = utc_now() - timedelta(hours=25)
    stale_media = MediaAsset(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="old_upload",
        filename="old_upload.mp4",
        file_size_bytes=100_000,
        mime_type="video/mp4",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/old/old_upload.mp4",
        status="uploading",
        created_at=old_time,
        updated_at=old_time,
    )
    repo.media_by_id[stale_media.id] = stale_media
    storage.objects.add(stale_media.storage_key)

    # Create a recent uploading record (<1h old)
    recent_time = utc_now() - timedelta(minutes=30)
    recent_media = MediaAsset(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="recent_upload",
        filename="recent_upload.mp4",
        file_size_bytes=100_000,
        mime_type="video/mp4",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/recent/recent_upload.mp4",
        status="uploading",
        created_at=recent_time,
        updated_at=recent_time,
    )
    repo.media_by_id[recent_media.id] = recent_media
    storage.objects.add(recent_media.storage_key)

    cleaner = CleanupOrphanedUploads(repo, storage)
    cleaned = await cleaner.execute(older_than_hours=24)

    assert cleaned == 1
    assert stale_media.storage_key not in storage.objects
    assert repo.media_by_id[stale_media.id].deleted_at is not None
    assert recent_media.storage_key in storage.objects
    assert repo.media_by_id[recent_media.id].deleted_at is None
