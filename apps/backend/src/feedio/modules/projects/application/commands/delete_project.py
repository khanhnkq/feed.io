from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository


class DeleteProject:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(self, organization_id: UUID, project_id: UUID) -> None:
        await self._repository.delete(
            organization_id=organization_id,
            project_id=project_id,
        )
