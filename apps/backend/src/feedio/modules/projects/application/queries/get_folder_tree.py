from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Folder


class GetFolderTree:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[Folder]:
        return await self._repository.get_folder_tree(
            organization_id=organization_id,
            project_id=project_id,
        )
