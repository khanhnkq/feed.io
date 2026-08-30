from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.errors import (
    ProjectAccessDeniedError,
    ProjectMemberNotFoundError,
    ProjectNotFoundError,
)


class RemoveProjectMember:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        target_user_id: UUID,
        actor_user_id: UUID | None = None,
        is_admin: bool = True,
    ) -> None:
        project = await self._repository.get(organization_id, project_id)
        if project is None:
            raise ProjectNotFoundError("Project not found")

        if not is_admin:
            actor_role = (
                await self._repository.get_user_project_role(project_id, actor_user_id)
                if actor_user_id
                else None
            )
            if actor_role != "editor":
                raise ProjectAccessDeniedError(
                    "Only project editors and organization admins can remove members"
                )

        if not await self._repository.is_user_project_member(project_id, target_user_id):
            raise ProjectMemberNotFoundError("Member not found in this project")

        await self._repository.remove_project_member(
            organization_id=organization_id,
            project_id=project_id,
            user_id=target_user_id,
        )
