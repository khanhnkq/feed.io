from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Project


class CreateProject:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(self, organization_id: UUID, name: str, description: str = "") -> Project:
        project = Project.create(organization_id, name, description)
        return await self._repository.add(project)
