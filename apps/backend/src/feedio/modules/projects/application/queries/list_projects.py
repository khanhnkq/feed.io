from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Project


class ListProjects:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(self, organization_id: UUID) -> list[Project]:
        return await self._repository.list_for_organization(organization_id)
