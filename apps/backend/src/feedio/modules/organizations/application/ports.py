from datetime import datetime
from typing import Protocol
from uuid import UUID

from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
    UserReceivedInvitationDetails,
)


class OrganizationRepository(Protocol):
    async def create_with_owner(
        self,
        *,
        user_id: UUID,
        name: str,
    ) -> OrganizationSummary: ...

    async def list_for_user(self, user_id: UUID) -> list[OrganizationSummary]: ...

    async def get_by_slug(self, slug: str, user_id: UUID) -> OrganizationSummary | None: ...

    async def get_by_id(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationSummary | None: ...

    async def update_organization(
        self,
        *,
        organization_id: UUID,
        name: str,
    ) -> OrganizationSummary: ...

    async def delete_organization(
        self,
        *,
        organization_id: UUID,
    ) -> None: ...

    async def list_members(self, organization_id: UUID) -> list[OrganizationMember]: ...

    async def find_member(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationMember | None: ...

    async def update_member_role(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        new_role: OrganizationRole,
    ) -> None: ...

    async def remove_member(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
    ) -> None: ...

    async def count_active_owners(self, organization_id: UUID) -> int: ...

    async def is_user_registered_and_verified(self, email: str) -> bool: ...

    async def find_user_id_by_email(self, email: str) -> UUID | None: ...

    async def find_user_email_by_id(self, user_id: UUID) -> str | None: ...

    async def create_invitation(
        self,
        *,
        organization_id: UUID,
        email: str,
        role: OrganizationRole,
        token_hash: str,
        invited_by_user_id: UUID,
        expires_at: datetime,
    ) -> OrganizationInvitation: ...

    async def list_active_invitations(
        self,
        organization_id: UUID,
    ) -> list[OrganizationInvitation]: ...

    async def list_active_invitations_for_email(
        self,
        email: str,
    ) -> list[UserReceivedInvitationDetails]: ...

    async def find_invitation_by_id(
        self,
        organization_id: UUID,
        invitation_id: UUID,
    ) -> OrganizationInvitation | None: ...

    async def find_invitation_by_id_only(
        self,
        invitation_id: UUID,
    ) -> OrganizationInvitation | None: ...

    async def find_invitation_by_token_hash(
        self,
        token_hash: str,
    ) -> tuple[OrganizationInvitation, OrganizationSummary] | None: ...

    async def revoke_invitation(
        self,
        *,
        organization_id: UUID,
        invitation_id: UUID,
    ) -> None: ...

    async def decline_invitation(
        self,
        *,
        invitation_id: UUID,
    ) -> None: ...

    async def accept_invitation(
        self,
        *,
        invitation_id: UUID,
        user_id: UUID,
    ) -> OrganizationSummary: ...


class OrganizationAccessRepository(Protocol):
    async def find_active_membership(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationContext | None: ...

    async def find_first_active_membership(
        self,
        user_id: UUID,
    ) -> OrganizationContext | None: ...

    async def set_tenant_context(self, context: OrganizationContext) -> None: ...


class OrganizationMailer(Protocol):
    async def send_invitation(
        self,
        *,
        email: str,
        inviter_name: str,
        organization_name: str,
        role: OrganizationRole,
        token: str,
    ) -> None: ...
