from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Project


class UpdateProject:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        name: str | None = None,
        description: str | None = None,
        visibility: str | None = None,
    ) -> Project:
        return await self._repository.update(
            organization_id=organization_id,
            project_id=project_id,
            name=name,
            description=description,
            visibility=visibility,
        )
