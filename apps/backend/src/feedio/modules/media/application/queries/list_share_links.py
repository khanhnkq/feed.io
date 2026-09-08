from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import ShareLink


class ListShareLinks:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[ShareLink]:
        return await self._repository.list_share_links(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
