from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset


class StackMedia:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        target_media_id: UUID,
        source_media_id: UUID,
        version_label: str | None = None,
    ) -> tuple[MediaAsset, MediaAsset]:
        return await self._repository.stack_media(
            organization_id=organization_id,
            project_id=project_id,
            target_media_id=target_media_id,
            source_media_id=source_media_id,
            version_label=version_label,
        )
