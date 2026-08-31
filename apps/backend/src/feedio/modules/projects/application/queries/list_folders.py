from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Folder
from feedio.shared.domain.pagination import Page


class ListFolders:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[Folder]:
        return await self._repository.list_folders(
            organization_id=organization_id,
            project_id=project_id,
            parent_id=parent_id,
            cursor=cursor,
            limit=limit,
        )
