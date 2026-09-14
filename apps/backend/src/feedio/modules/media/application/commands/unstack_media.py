from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset


class UnstackMedia:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset:
        return await self._repository.unstack_media(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
