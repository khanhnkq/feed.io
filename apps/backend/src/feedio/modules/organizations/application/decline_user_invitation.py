from datetime import UTC, datetime
from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import (
    InvitationAlreadyAcceptedError,
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvitationRevokedError,
)


class DeclineUserInvitation:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        invitation_id: UUID,
        user_id: UUID,
    ) -> None:
        invitation = await self._repository.find_invitation_by_id_only(invitation_id)
        if invitation is None:
            raise InvitationNotFoundError("Invitation not found")

        if invitation.accepted_at is not None:
            raise InvitationAlreadyAcceptedError("Invitation has already been accepted")
        if invitation.revoked_at is not None:
            raise InvitationRevokedError("Invitation has already been revoked or declined")
        if invitation.expires_at <= datetime.now(UTC):
            raise InvitationExpiredError("Invitation has expired")

        user_email = await self._repository.find_user_email_by_id(user_id)
        if not user_email or user_email.strip().lower() != invitation.email.strip().lower():
            raise InvitationEmailMismatchError(
                "Your signed-in account is not the one invited to this organization."
            )

        await self._repository.decline_invitation(invitation_id=invitation.id)
