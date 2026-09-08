from collections.abc import Awaitable, Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.application.accept_invitation import AcceptInvitation
from feedio.modules.organizations.application.accept_user_invitation_direct import (
    AcceptUserInvitationDirect,
)
from feedio.modules.organizations.application.decline_user_invitation import (
    DeclineUserInvitation,
)
from feedio.modules.organizations.application.get_invitation_details import (
    GetInvitationDetails,
)
from feedio.modules.organizations.application.invite_member import InviteMember
from feedio.modules.organizations.application.list_invitations import (
    ListOrganizationInvitations,
)
from feedio.modules.organizations.application.list_user_received_invitations import (
    ListUserReceivedInvitations,
)
from feedio.modules.organizations.application.revoke_invitation import RevokeInvitation
from feedio.modules.organizations.domain.errors import (
    InsufficientRolePermissionError,
    InvitationAlreadyAcceptedError,
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvitationRevokedError,
    UserAlreadyMemberError,
    UserNotRegisteredError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.organizations.presentation.schemas import (
    InviteMemberRequest,
    OrganizationInvitationResponse,
    OrganizationResponse,
    PublicInvitationDetailsResponse,
    UserReceivedInvitationResponse,
)
from feedio.shared.presentation.pagination import PaginatedResponse

CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]
OrganizationContextProvider = Callable[..., OrganizationContext | Awaitable[OrganizationContext]]
InviteMemberProvider = Callable[..., InviteMember | Awaitable[InviteMember]]
ListInvitationsProvider = Callable[
    ..., ListOrganizationInvitations | Awaitable[ListOrganizationInvitations]
]
RevokeInvitationProvider = Callable[..., RevokeInvitation | Awaitable[RevokeInvitation]]
GetInvitationDetailsProvider = Callable[..., GetInvitationDetails | Awaitable[GetInvitationDetails]]
AcceptInvitationProvider = Callable[..., AcceptInvitation | Awaitable[AcceptInvitation]]
ListUserReceivedInvitationsProvider = Callable[
    ..., ListUserReceivedInvitations | Awaitable[ListUserReceivedInvitations]
]
AcceptUserInvitationDirectProvider = Callable[
    ..., AcceptUserInvitationDirect | Awaitable[AcceptUserInvitationDirect]
]
DeclineUserInvitationProvider = Callable[
    ..., DeclineUserInvitation | Awaitable[DeclineUserInvitation]
]
EventPublisherProvider = Callable[[], RealtimeEventPublisher | None]
NotificationServiceProvider = Callable[..., Any]


def _default_context() -> OrganizationContext:
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Context not configured")


def _default_provider() -> None:
    return None


def create_invitations_router(
    current_user_provider: CurrentUserProvider,
    context_provider: OrganizationContextProvider | None = None,
    invite_member_provider: InviteMemberProvider | None = None,
    list_invitations_provider: ListInvitationsProvider | None = None,
    revoke_invitation_provider: RevokeInvitationProvider | None = None,
    get_invitation_details_provider: GetInvitationDetailsProvider | None = None,
    accept_invitation_provider: AcceptInvitationProvider | None = None,
    list_user_received_invitations_provider: ListUserReceivedInvitationsProvider | None = None,
    accept_user_invitation_direct_provider: AcceptUserInvitationDirectProvider | None = None,
    decline_user_invitation_provider: DeclineUserInvitationProvider | None = None,
    event_publisher_provider: EventPublisherProvider | None = None,
    notification_service_provider: NotificationServiceProvider | None = None,
) -> APIRouter:
    router = APIRouter()
    ctx_provider = context_provider or _default_context
    invitations_provider = list_invitations_provider or _default_provider
    noti_dep = notification_service_provider or _default_provider

    @router.get(
        "/organizations/{organization_id}/invitations",
        operation_id="list_organization_invitations",
        tags=["organization-invitations"],
    )
    async def list_invitations(
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[ListOrganizationInvitations | None, Depends(invitations_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[OrganizationInvitationResponse]:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            page = await use_case.execute(context, cursor=cursor, limit=limit)
            return PaginatedResponse(
                items=[OrganizationInvitationResponse.from_domain(inv) for inv in page.items],
                next_cursor=page.next_cursor,
                has_more=page.has_more,
            )
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    invite_prov = invite_member_provider or _default_provider

    @router.post(
        "/organizations/{organization_id}/invitations",
        status_code=status.HTTP_201_CREATED,
        operation_id="invite_member",
        tags=["organization-invitations"],
    )
    async def invite_member(
        body: InviteMemberRequest,
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[InviteMember | None, Depends(invite_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
        notification_service: Annotated[NotificationService | None, Depends(noti_dep)] = None,
    ) -> OrganizationInvitationResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        inviter_name = (
            f"{current_user.display_name} ({current_user.email})"
            if current_user.display_name
            and current_user.display_name.strip().lower() != current_user.email.strip().lower()
            else (current_user.display_name or current_user.email)
        )
        try:
            invitation = await use_case.execute(
                context=context,
                inviter_name=inviter_name,
                email=body.email,
                role=body.role,
            )
            # Dispatch in-app notification to the invited user if registered
            if notification_service:
                try:
                    invited_user_id = await use_case._repository.find_user_id_by_email(body.email.strip().lower())
                    if invited_user_id:
                        org = await use_case._repository.get_by_id(context.organization_id, context.user_id)
                        org_name = org.name if org else "the organization"
                        role_str = body.role.value if hasattr(body.role, "value") else str(body.role)
                        await notification_service.create_notification(
                            user_id=invited_user_id,
                            organization_id=context.organization_id,
                            actor_id=context.user_id,
                            type=NotificationType.ORGANIZATION_INVITED,
                            title="Organization Invitation",
                            message=f'You have been invited to join "{org_name}" as {role_str}.',
                            link_url="/app/invitations",
                            metadata_json={"organization_id": str(context.organization_id), "role": role_str},
                        )
                except Exception:
                    pass
            return OrganizationInvitationResponse.from_domain(invitation)
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except UserNotRegisteredError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except UserAlreadyMemberError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    revoke_prov = revoke_invitation_provider or _default_provider

    @router.delete(
        "/organizations/{organization_id}/invitations/{invitation_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="revoke_invitation",
        tags=["organization-invitations"],
    )
    async def revoke_invitation(
        invitation_id: UUID,
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[RevokeInvitation | None, Depends(revoke_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(context=context, invitation_id=invitation_id)
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except InvitationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    list_my_inv_prov = list_user_received_invitations_provider or _default_provider

    @router.get(
        "/invitations/me",
        operation_id="list_my_invitations",
        tags=["user-invitations"],
    )
    async def list_my_invitations(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[ListUserReceivedInvitations | None, Depends(list_my_inv_prov)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[UserReceivedInvitationResponse]:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        page = await use_case.execute(email=current_user.email, cursor=cursor, limit=limit)
        return PaginatedResponse(
            items=[UserReceivedInvitationResponse.from_domain(inv) for inv in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
        )

    accept_my_inv_prov = accept_user_invitation_direct_provider or _default_provider

    @router.post(
        "/invitations/me/{invitation_id}/accept",
        operation_id="accept_my_invitation",
        tags=["user-invitations"],
    )
    async def accept_my_invitation(
        invitation_id: UUID,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[AcceptUserInvitationDirect | None, Depends(accept_my_inv_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> OrganizationResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            org = await use_case.execute(
                invitation_id=invitation_id,
                user_id=current_user.id,
            )
            resp = OrganizationResponse.from_domain(org)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="organization.members_updated",
                            room=f"org:{org.id}",
                            payload={
                                "organization_id": str(org.id),
                                "user_id": str(current_user.id),
                                "action": "joined",
                            },
                        )
                    )
            return resp
        except InvitationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except InvitationExpiredError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationRevokedError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationAlreadyAcceptedError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
        except InvitationEmailMismatchError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except UserAlreadyMemberError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    decline_my_inv_prov = decline_user_invitation_provider or _default_provider

    @router.post(
        "/invitations/me/{invitation_id}/decline",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="decline_my_invitation",
        tags=["user-invitations"],
    )
    async def decline_my_invitation(
        invitation_id: UUID,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[DeclineUserInvitation | None, Depends(decline_my_inv_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(
                invitation_id=invitation_id,
                user_id=current_user.id,
            )
        except InvitationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except InvitationExpiredError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationRevokedError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationAlreadyAcceptedError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
        except InvitationEmailMismatchError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    get_inv_details_prov = get_invitation_details_provider or _default_provider

    @router.get(
        "/invitations/{token}",
        operation_id="get_invitation_details",
        tags=["organization-invitations"],
    )
    async def get_invitation_details(
        token: str,
        use_case: Annotated[GetInvitationDetails | None, Depends(get_inv_details_prov)],
    ) -> PublicInvitationDetailsResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            details = await use_case.execute(token)
            return PublicInvitationDetailsResponse.from_domain(details)
        except InvitationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    accept_inv_prov = accept_invitation_provider or _default_provider

    @router.post(
        "/invitations/{token}/accept",
        operation_id="accept_invitation",
        tags=["organization-invitations"],
    )
    async def accept_invitation(
        token: str,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[AcceptInvitation | None, Depends(accept_inv_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> OrganizationResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            org = await use_case.execute(raw_token=token, user_id=current_user.id)
            resp = OrganizationResponse.from_domain(org)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="organization.members_updated",
                            room=f"org:{org.id}",
                            payload={
                                "organization_id": str(org.id),
                                "user_id": str(current_user.id),
                                "action": "joined",
                            },
                        )
                    )
            return resp
        except InvitationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except InvitationExpiredError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationRevokedError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except InvitationAlreadyAcceptedError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
        except InvitationEmailMismatchError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except UserAlreadyMemberError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    return router
