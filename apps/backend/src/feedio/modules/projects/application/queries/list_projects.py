from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Project
from feedio.shared.domain.pagination import Page


class ListProjects:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        user_id: UUID | None = None,
        is_admin: bool = True,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[Project]:
        return await self._repository.list_for_organization(
            organization_id=organization_id,
            user_id=user_id,
            is_admin=is_admin,
            cursor=cursor,
            limit=limit,
        )
