import logging
from datetime import timedelta

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.shared.infrastructure.persistence import utc_now

logger = logging.getLogger(__name__)


class CleanupOrphanedUploads:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
    ) -> None:
        self._repository = repository
        self._storage = storage

    async def execute(
        self,
        older_than_hours: int = 24,
    ) -> int:
        cutoff = utc_now() - timedelta(hours=older_than_hours)
        incomplete_uploads = await self._repository.list_incomplete_multipart_uploads(cutoff)
        cleaned_count = 0

        for media in incomplete_uploads:
            try:
                await self._storage.delete_object(media.storage_key)
                if media.thumbnail_storage_key:
                    await self._storage.delete_object(media.thumbnail_storage_key)
                await self._repository.soft_delete(
                    organization_id=media.organization_id,
                    project_id=media.project_id,
                    media_id=media.id,
                )
                cleaned_count += 1
            except Exception as e:
                logger.warning(
                    "Failed to cleanup orphaned media asset %s: %s",
                    media.id,
                    e,
                )

        return cleaned_count
