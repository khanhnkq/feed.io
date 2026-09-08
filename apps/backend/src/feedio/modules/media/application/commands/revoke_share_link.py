from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import ShareLink


class RevokeShareLink:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        share_link_id: UUID,
    ) -> ShareLink:
        return await self._repository.revoke_share_link(
            organization_id=organization_id,
            project_id=project_id,
            share_link_id=share_link_id,
        )
