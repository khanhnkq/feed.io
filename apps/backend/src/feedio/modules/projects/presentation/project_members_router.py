from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
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
from feedio.shared.presentation.pagination import PaginatedResponse

RepositoryProvider = Callable[..., ProjectRepository]
OrganizationContextProvider = Callable[..., OrganizationContext]
EventPublisherProvider = Callable[[], RealtimeEventPublisher | None]
NotificationServiceProvider = Callable[..., Any]


def _default_provider() -> None:
    return None


def create_project_members_router(
    repository_provider: RepositoryProvider,
    organization_context_provider: OrganizationContextProvider,
    event_publisher_provider: EventPublisherProvider | None = None,
    notification_service_provider: NotificationServiceProvider | None = None,
) -> APIRouter:
    router = APIRouter(
        prefix="/{project_id}/members",
        tags=["project-members"],
    )

    noti_dep = notification_service_provider or _default_provider

    @router.get("", operation_id="list_project_members")
    async def list_project_members(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[ProjectMemberResponse]:
        try:
            is_admin = context.role in ("owner", "admin")
            page = await ListProjectMembers(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
                cursor=cursor,
                limit=limit,
            )
            return PaginatedResponse(
                items=[ProjectMemberResponse.from_domain(m) for m in page.items],
                next_cursor=page.next_cursor,
                has_more=page.has_more,
            )
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
        notification_service: Annotated[NotificationService | None, Depends(noti_dep)] = None,
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
            resp = ProjectMemberResponse.from_domain(member)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.members_updated",
                            room=f"project:{project_id}",
                            payload={
                                "project_id": str(project_id),
                                "user_id": str(payload.user_id),
                                "role": payload.project_role.value if hasattr(payload.project_role, "value") else str(payload.project_role),
                                "action": "added",
                            },
                        )
                    )
            if notification_service and payload.user_id != context.user_id:
                try:
                    await notification_service.create_notification(
                        user_id=payload.user_id,
                        organization_id=context.organization_id,
                        type=NotificationType.PROJECT_ACCESS_GRANTED,
                        title="Added to project",
                        message=f"You have been granted access to the project as {payload.project_role.value if hasattr(payload.project_role, 'value') else payload.project_role}.",
                        link_url=f"/app/organizations/{context.organization_id}/projects/{project_id}",
                        actor_id=context.user_id,
                        metadata_json={"project_id": str(project_id), "role": str(payload.project_role)},
                    )
                except Exception:
                    pass
            return resp
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
        notification_service: Annotated[NotificationService | None, Depends(noti_dep)] = None,
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
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.members_updated",
                            room=f"project:{project_id}",
                            payload={
                                "project_id": str(project_id),
                                "user_id": str(user_id),
                                "role": payload.project_role.value if hasattr(payload.project_role, "value") else str(payload.project_role),
                                "action": "role_updated",
                            },
                        )
                    )
            if notification_service and user_id != context.user_id:
                try:
                    await notification_service.create_notification(
                        user_id=user_id,
                        organization_id=context.organization_id,
                        type=NotificationType.ROLE_UPDATED,
                        title="Project role updated",
                        message=f"Your project role was changed to {payload.project_role.value if hasattr(payload.project_role, 'value') else payload.project_role}.",
                        link_url=f"/app/organizations/{context.organization_id}/projects/{project_id}",
                        actor_id=context.user_id,
                        metadata_json={"project_id": str(project_id), "role": str(payload.project_role)},
                    )
                except Exception:
                    pass
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
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.members_updated",
                            room=f"project:{project_id}",
                            payload={
                                "project_id": str(project_id),
                                "user_id": str(user_id),
                                "action": "removed",
                            },
                        )
                    )
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectMemberNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    return router
