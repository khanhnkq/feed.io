from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Folder


class CreateFolder:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        name: str,
        parent_id: UUID | None = None,
    ) -> Folder:
        folder = Folder.create(
            organization_id=organization_id,
            project_id=project_id,
            name=name,
            parent_id=parent_id,
        )
        return await self._repository.add_folder(folder)
