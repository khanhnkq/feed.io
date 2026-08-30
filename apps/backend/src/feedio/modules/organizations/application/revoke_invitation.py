from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import (
    InsufficientRolePermissionError,
    InvitationNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class RevokeInvitation:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        invitation_id: UUID,
    ) -> None:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientRolePermissionError("Only owners and admins can revoke invitations")

        invitation = await self._repository.find_invitation_by_id(
            context.organization_id,
            invitation_id,
        )
        if (
            invitation is None
            or invitation.revoked_at is not None
            or invitation.accepted_at is not None
        ):
            raise InvitationNotFoundError("Invitation not found or already processed")

        await self._repository.revoke_invitation(
            organization_id=context.organization_id,
            invitation_id=invitation_id,
        )
