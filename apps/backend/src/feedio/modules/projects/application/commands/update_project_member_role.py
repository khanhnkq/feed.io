from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.errors import (
    InvalidProjectRoleError,
    ProjectAccessDeniedError,
    ProjectMemberNotFoundError,
    ProjectNotFoundError,
)


class UpdateProjectMemberRole:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        target_user_id: UUID,
        new_role: str,
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
                    "Only project editors and organization admins can update member roles"
                )

        clean_role = new_role.strip().lower()
        if clean_role not in ("editor", "viewer"):
            raise InvalidProjectRoleError("Project role must be 'editor' or 'viewer'")

        if not await self._repository.is_user_project_member(project_id, target_user_id):
            raise ProjectMemberNotFoundError("Member not found in this project")

        await self._repository.update_project_member_role(
            organization_id=organization_id,
            project_id=project_id,
            user_id=target_user_id,
            new_role=clean_role,
        )
