from collections.abc import Awaitable, Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.application.list_members import ListOrganizationMembers
from feedio.modules.organizations.application.remove_member import RemoveMember
from feedio.modules.organizations.application.update_member_role import UpdateMemberRole
from feedio.modules.organizations.domain.errors import (
    CannotChangeSoleOwnerRoleError,
    CannotRemoveSoleOwnerError,
    InsufficientRolePermissionError,
    MemberNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.organizations.presentation.schemas import (
    OrganizationMemberResponse,
    UpdateMemberRoleRequest,
)
from feedio.shared.presentation.pagination import PaginatedResponse

ContextProvider = Callable[[], Awaitable[OrganizationContext]]
ListMembersProvider = Callable[[], Awaitable[ListOrganizationMembers]]
UpdateMemberRoleProvider = Callable[[], Awaitable[UpdateMemberRole]]
RemoveMemberProvider = Callable[[], Awaitable[RemoveMember]]
EventPublisherProvider = Callable[[], RealtimeEventPublisher | None]
NotificationServiceProvider = Callable[..., Any]


async def _default_context() -> OrganizationContext:
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Context not configured")


async def _default_provider() -> None:
    return None


def create_members_router(
    context_provider: ContextProvider | None = None,
    list_members_provider: ListMembersProvider | None = None,
    update_member_role_provider: UpdateMemberRoleProvider | None = None,
    remove_member_provider: RemoveMemberProvider | None = None,
    event_publisher_provider: EventPublisherProvider | None = None,
    notification_service_provider: NotificationServiceProvider | None = None,
) -> APIRouter:
    router = APIRouter()
    ctx_provider = context_provider or _default_context
    members_provider = list_members_provider or _default_provider
    noti_dep = notification_service_provider or _default_provider

    @router.get(
        "/organizations/{organization_id}/members",
        operation_id="list_organization_members",
        tags=["organization-members"],
    )
    async def list_members(
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[ListOrganizationMembers | None, Depends(members_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[OrganizationMemberResponse]:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        page = await use_case.execute(context.organization_id, cursor=cursor, limit=limit)
        return PaginatedResponse(
            items=[OrganizationMemberResponse.from_domain(m) for m in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
        )

    update_role_prov = update_member_role_provider or _default_provider

    @router.patch(
        "/organizations/{organization_id}/members/{user_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="update_member_role",
        tags=["organization-members"],
    )
    async def update_member_role(
        user_id: UUID,
        body: UpdateMemberRoleRequest,
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[UpdateMemberRole | None, Depends(update_role_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
        notification_service: Annotated[NotificationService | None, Depends(noti_dep)] = None,
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(
                context=context,
                target_user_id=user_id,
                new_role=body.role,
            )
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="organization.members_updated",
                            room=f"org:{context.organization_id}",
                            payload={
                                "organization_id": str(context.organization_id),
                                "user_id": str(user_id),
                                "role": body.role.value if hasattr(body.role, "value") else str(body.role),
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
                        title="Role updated",
                        message=f"Your organization role was changed to {body.role.value if hasattr(body.role, 'value') else body.role}.",
                        link_url=f"/app/organizations/{context.organization_id}/settings/members",
                        actor_id=context.user_id,
                        metadata_json={"organization_id": str(context.organization_id), "role": str(body.role)},
                    )
                except Exception:
                    pass
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except MemberNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except CannotChangeSoleOwnerRoleError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    remove_member_prov = remove_member_provider or _default_provider

    @router.delete(
        "/organizations/{organization_id}/members/{user_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="remove_member",
        tags=["organization-members"],
    )
    async def remove_member(
        user_id: UUID,
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[RemoveMember | None, Depends(remove_member_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(context=context, target_user_id=user_id)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="organization.members_updated",
                            room=f"org:{context.organization_id}",
                            payload={
                                "organization_id": str(context.organization_id),
                                "user_id": str(user_id),
                                "action": "removed",
                            },
                        )
                    )
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except MemberNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except CannotRemoveSoleOwnerError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    return router
