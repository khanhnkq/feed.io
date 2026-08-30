from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.application.accept_invitation import AcceptInvitation
from feedio.modules.organizations.application.accept_user_invitation_direct import (
    AcceptUserInvitationDirect,
)
from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.application.decline_user_invitation import (
    DeclineUserInvitation,
)
from feedio.modules.organizations.application.delete import DeleteOrganization
from feedio.modules.organizations.application.get_by_slug import GetOrganizationBySlug
from feedio.modules.organizations.application.get_invitation_details import (
    GetInvitationDetails,
)
from feedio.modules.organizations.application.invite_member import InviteMember
from feedio.modules.organizations.application.leave import LeaveOrganization
from feedio.modules.organizations.application.list_invitations import (
    ListOrganizationInvitations,
)
from feedio.modules.organizations.application.list_members import ListOrganizationMembers
from feedio.modules.organizations.application.list_user_organizations import (
    ListUserOrganizations,
)
from feedio.modules.organizations.application.list_user_received_invitations import (
    ListUserReceivedInvitations,
)
from feedio.modules.organizations.application.remove_member import RemoveMember
from feedio.modules.organizations.application.revoke_invitation import RevokeInvitation
from feedio.modules.organizations.application.update import UpdateOrganization
from feedio.modules.organizations.application.update_member_role import UpdateMemberRole
from feedio.modules.organizations.domain.errors import (
    CannotRemoveSoleOwnerError,
    InsufficientRolePermissionError,
    OrganizationAccessDeniedError,
    OrganizationNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.organizations.presentation.invitations_router import (
    create_invitations_router,
)
from feedio.modules.organizations.presentation.members_router import (
    create_members_router,
)
from feedio.modules.organizations.presentation.schemas import (
    CreateOrganizationRequest,
    OrganizationResponse,
    UpdateOrganizationRequest,
)

CreateOrganizationProvider = Callable[..., CreateOrganization | Awaitable[CreateOrganization]]
ListOrganizationsProvider = Callable[
    ..., ListUserOrganizations | Awaitable[ListUserOrganizations]
]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]
GetBySlugProvider = Callable[..., GetOrganizationBySlug | Awaitable[GetOrganizationBySlug]]
OrganizationContextProvider = Callable[..., OrganizationContext | Awaitable[OrganizationContext]]
UpdateOrganizationProvider = Callable[..., UpdateOrganization | Awaitable[UpdateOrganization]]
DeleteOrganizationProvider = Callable[..., DeleteOrganization | Awaitable[DeleteOrganization]]
LeaveOrganizationProvider = Callable[..., LeaveOrganization | Awaitable[LeaveOrganization]]

ListMembersProvider = Callable[..., ListOrganizationMembers | Awaitable[ListOrganizationMembers]]
InviteMemberProvider = Callable[..., InviteMember | Awaitable[InviteMember]]
ListInvitationsProvider = Callable[
    ..., ListOrganizationInvitations | Awaitable[ListOrganizationInvitations]
]
RevokeInvitationProvider = Callable[
    ..., RevokeInvitation | Awaitable[RevokeInvitation]
]
UpdateMemberRoleProvider = Callable[..., UpdateMemberRole | Awaitable[UpdateMemberRole]]
RemoveMemberProvider = Callable[..., RemoveMember | Awaitable[RemoveMember]]
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


def create_organizations_router(
    create_organization_provider: CreateOrganizationProvider,
    list_organizations_provider: ListOrganizationsProvider,
    current_user_provider: CurrentUserProvider,
    get_by_slug_provider: GetBySlugProvider | None = None,
    context_provider: OrganizationContextProvider | None = None,
    list_members_provider: ListMembersProvider | None = None,
    invite_member_provider: InviteMemberProvider | None = None,
    list_invitations_provider: ListInvitationsProvider | None = None,
    revoke_invitation_provider: RevokeInvitationProvider | None = None,
    update_member_role_provider: UpdateMemberRoleProvider | None = None,
    remove_member_provider: RemoveMemberProvider | None = None,
    get_invitation_details_provider: GetInvitationDetailsProvider | None = None,
    accept_invitation_provider: AcceptInvitationProvider | None = None,
    list_user_received_invitations_provider: ListUserReceivedInvitationsProvider | None = None,
    accept_user_invitation_direct_provider: AcceptUserInvitationDirectProvider | None = None,
    decline_user_invitation_provider: DeclineUserInvitationProvider | None = None,
    update_organization_provider: UpdateOrganizationProvider | None = None,
    delete_organization_provider: DeleteOrganizationProvider | None = None,
    leave_organization_provider: LeaveOrganizationProvider | None = None,
) -> APIRouter:
    router = APIRouter()
    ctx_provider = context_provider or _default_context

    @router.post(
        "/organizations",
        status_code=status.HTTP_201_CREATED,
        operation_id="create_organization",
        tags=["organizations"],
    )
    async def create_organization(
        body: CreateOrganizationRequest,
        use_case: Annotated[CreateOrganization, Depends(create_organization_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> OrganizationResponse:
        organization = await use_case.execute(current_user.id, body.name)
        return OrganizationResponse.from_domain(organization)

    @router.get(
        "/organizations",
        operation_id="list_organizations",
        tags=["organizations"],
    )
    async def list_organizations(
        list_use_case: Annotated[ListUserOrganizations, Depends(list_organizations_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> list[OrganizationResponse]:
        organizations = await list_use_case.execute(current_user.id)
        return [OrganizationResponse.from_domain(item) for item in organizations]

    slug_provider = get_by_slug_provider or _default_provider

    @router.get(
        "/organizations/by-slug/{slug}",
        operation_id="get_organization_by_slug",
        tags=["organizations"],
    )
    async def get_organization_by_slug(
        slug: str,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[GetOrganizationBySlug | None, Depends(slug_provider)],
    ) -> OrganizationResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        organization = await use_case.execute(slug, current_user.id)
        if organization is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
        return OrganizationResponse.from_domain(organization)

    update_org_prov = update_organization_provider or _default_provider

    @router.patch(
        "/organizations/{organization_id}",
        operation_id="update_organization",
        tags=["organizations"],
    )
    async def update_organization(
        body: UpdateOrganizationRequest,
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[UpdateOrganization | None, Depends(update_org_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> OrganizationResponse:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            organization = await use_case.execute(context=context, name=body.name)
            return OrganizationResponse.from_domain(organization)
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except OrganizationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ValueError as error:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error

    delete_org_prov = delete_organization_provider or _default_provider

    @router.delete(
        "/organizations/{organization_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_organization",
        tags=["organizations"],
    )
    async def delete_organization(
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        use_case: Annotated[DeleteOrganization | None, Depends(delete_org_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(context=context)
        except InsufficientRolePermissionError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except OrganizationNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    leave_org_prov = leave_organization_provider or _default_provider

    @router.post(
        "/organizations/{organization_id}/leave",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="leave_organization",
        tags=["organizations"],
    )
    async def leave_organization(
        context: Annotated[OrganizationContext, Depends(ctx_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        use_case: Annotated[LeaveOrganization | None, Depends(leave_org_prov)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        if use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        try:
            await use_case.execute(context=context, user_id=current_user.id)
        except OrganizationAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except CannotRemoveSoleOwnerError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    # Mount members router
    members_router = create_members_router(
        context_provider=context_provider,
        list_members_provider=list_members_provider,
        update_member_role_provider=update_member_role_provider,
        remove_member_provider=remove_member_provider,
    )
    router.include_router(members_router)

    # Mount invitations router
    invitations_router = create_invitations_router(
        current_user_provider=current_user_provider,
        context_provider=context_provider,
        invite_member_provider=invite_member_provider,
        list_invitations_provider=list_invitations_provider,
        revoke_invitation_provider=revoke_invitation_provider,
        get_invitation_details_provider=get_invitation_details_provider,
        accept_invitation_provider=accept_invitation_provider,
        list_user_received_invitations_provider=list_user_received_invitations_provider,
        accept_user_invitation_direct_provider=accept_user_invitation_direct_provider,
        decline_user_invitation_provider=decline_user_invitation_provider,
    )
    router.include_router(invitations_router)

    return router
