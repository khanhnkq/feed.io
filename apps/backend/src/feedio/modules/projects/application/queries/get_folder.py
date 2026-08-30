from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Folder
from feedio.modules.projects.domain.errors import FolderNotFoundError


class GetFolder:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> Folder:
        folder = await self._repository.get_folder(
            organization_id=organization_id,
            project_id=project_id,
            folder_id=folder_id,
        )
        if folder is None:
            raise FolderNotFoundError("Folder not found")
        return folder
