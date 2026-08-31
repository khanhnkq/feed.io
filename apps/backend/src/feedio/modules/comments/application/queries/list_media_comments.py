from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import MediaComment


class ListMediaComments:
    def __init__(self, repository: CommentRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[MediaComment]:
        return await self._repository.list_by_media(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
