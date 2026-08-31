from uuid import UUID

from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError


class CompleteMediaUpload:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
        job_publisher: MediaJobPublisher | None = None,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._job_publisher = job_publisher

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError("Media asset not found")

        if media.status in ("ready", "processing"):
            return media

        is_image = media.mime_type.lower().startswith("image/")

        # Images are immediately ready; Videos transition to processing for background transcoding
        if is_image:
            target_status = "ready"
        else:
            target_status = "processing" if self._job_publisher else "ready"

        updated = await self._repository.update_status(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            status=target_status,
        )

        # Dispatch background transcode job to RabbitMQ only for videos
        if not is_image and self._job_publisher:
            await self._job_publisher.publish_transcode_job(
                organization_id=organization_id,
                project_id=project_id,
                media_id=media_id,
                storage_key=media.storage_key,
                filename=media.filename,
                mime_type=media.mime_type,
            )

        return updated
