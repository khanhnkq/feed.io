from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
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
) -> APIRouter:
    router = APIRouter()
    ctx_provider = context_provider or _default_context

    invitations_provider = list_invitations_provider or _default_provider

    @router.get(
        "/organizations/{organization_id}/invitations",
        operation_id="list_organization_invitations",
        tags=["organization-invitations"],
    )
    async def list_invitations(
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[ListOrganizationInvitations | None, Depends(invitations_provider)],
    ) -> list[OrganizationInvitationResponse]:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            invitations = await use_case.execute(context)
            return [OrganizationInvitationResponse.from_domain(inv) for inv in invitations]
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
    ) -> list[UserReceivedInvitationResponse]:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        invitations = await use_case.execute(email=current_user.email)
        return [UserReceivedInvitationResponse.from_domain(inv) for inv in invitations]

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
            return OrganizationResponse.from_domain(org)
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
            return OrganizationResponse.from_domain(org)
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
