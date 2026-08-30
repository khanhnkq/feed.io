from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.projects.application.commands.add_project_member import AddProjectMember
from feedio.modules.projects.application.commands.remove_project_member import (
    RemoveProjectMember,
)
from feedio.modules.projects.application.commands.update_project_member_role import (
    UpdateProjectMemberRole,
)
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.list_project_members import (
    ListProjectMembers,
)
from feedio.modules.projects.domain.errors import (
    InvalidProjectRoleError,
    ProjectAccessDeniedError,
    ProjectMemberNotFoundError,
    ProjectNotFoundError,
    UserAlreadyProjectMemberError,
)
from feedio.modules.projects.presentation.schemas import (
    AddProjectMemberRequest,
    ProjectMemberResponse,
    UpdateProjectMemberRoleRequest,
)

RepositoryProvider = Callable[..., ProjectRepository]
OrganizationContextProvider = Callable[..., OrganizationContext]


def create_project_members_router(
    repository_provider: RepositoryProvider,
    organization_context_provider: OrganizationContextProvider,
) -> APIRouter:
    router = APIRouter(
        prefix="/{project_id}/members",
        tags=["project-members"],
    )

    @router.get("", operation_id="list_project_members")
    async def list_project_members(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> list[ProjectMemberResponse]:
        try:
            is_admin = context.role in ("owner", "admin")
            members = await ListProjectMembers(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
            return [ProjectMemberResponse.from_domain(m) for m in members]
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    @router.post(
        "",
        status_code=status.HTTP_201_CREATED,
        operation_id="add_project_member",
    )
    async def add_project_member(
        project_id: UUID,
        payload: AddProjectMemberRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> ProjectMemberResponse:
        try:
            is_admin = context.role in ("owner", "admin")
            member = await AddProjectMember(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                target_user_id=payload.user_id,
                project_role=payload.project_role,
                actor_user_id=context.user_id,
                is_admin=is_admin,
            )
            return ProjectMemberResponse.from_domain(member)
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except InvalidProjectRoleError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except UserAlreadyProjectMemberError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    @router.patch(
        "/{user_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="update_project_member_role",
    )
    async def update_project_member_role(
        project_id: UUID,
        user_id: UUID,
        payload: UpdateProjectMemberRoleRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        try:
            is_admin = context.role in ("owner", "admin")
            await UpdateProjectMemberRole(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                target_user_id=user_id,
                new_role=payload.project_role,
                actor_user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectMemberNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except InvalidProjectRoleError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.delete(
        "/{user_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="remove_project_member",
    )
    async def remove_project_member(
        project_id: UUID,
        user_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        try:
            is_admin = context.role in ("owner", "admin")
            await RemoveProjectMember(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                target_user_id=user_id,
                actor_user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectMemberNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    return router
