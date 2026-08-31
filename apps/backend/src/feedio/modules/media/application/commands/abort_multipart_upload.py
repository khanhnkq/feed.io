from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.errors import MediaNotFoundError


class AbortMultipartUpload:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
    ) -> None:
        self._repository = repository
        self._storage = storage

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        upload_id: str,
    ) -> None:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError("Media asset not found")

        # Abort multipart upload in S3 storage (frees disk space in Garage/AWS)
        await self._storage.abort_multipart_upload(
            storage_key=media.storage_key,
            upload_id=upload_id,
        )

        # Soft delete the draft media asset
        await self._repository.soft_delete(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
