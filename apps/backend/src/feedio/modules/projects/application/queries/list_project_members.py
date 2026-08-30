from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import ProjectMember
from feedio.modules.projects.domain.errors import (
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)


class ListProjectMembers:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID | None = None,
        is_admin: bool = True,
    ) -> list[ProjectMember]:
        project = await self._repository.get(organization_id, project_id)
        if project is None:
            raise ProjectNotFoundError("Project not found")

        if not is_admin and project.visibility == "private" and (
            user_id is None or not await self._repository.is_user_project_member(
                project_id, user_id
            )
        ):
            raise ProjectAccessDeniedError("Access to this private project is restricted")

        return await self._repository.list_project_members(organization_id, project_id)
