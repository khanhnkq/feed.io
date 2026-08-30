from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Folder


class MoveFolder:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_parent_id: UUID | None,
    ) -> Folder:
        return await self._repository.move_folder(
            organization_id=organization_id,
            project_id=project_id,
            folder_id=folder_id,
            new_parent_id=new_parent_id,
        )
