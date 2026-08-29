from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import BreadcrumbItem


class GetFolderBreadcrumbs:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> list[BreadcrumbItem]:
        return await self._repository.get_folder_breadcrumbs(
            organization_id=organization_id,
            project_id=project_id,
            folder_id=folder_id,
        )
