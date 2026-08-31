from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository


class DeleteMedia:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> None:
        await self._repository.soft_delete(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
