import hashlib
from datetime import UTC, datetime

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import InvitationNotFoundError
from feedio.modules.organizations.domain.value_objects import InvitationDetails


class GetInvitationDetails:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, raw_token: str) -> InvitationDetails:
        token_hash = hashlib.sha256(raw_token.strip().encode()).hexdigest()
        result = await self._repository.find_invitation_by_token_hash(token_hash)
        if result is None:
            raise InvitationNotFoundError("Invitation not found")

        invitation, org = result
        now = datetime.now(UTC)
        is_expired = invitation.expires_at <= now
        is_accepted = invitation.accepted_at is not None
        is_revoked = invitation.revoked_at is not None

        return InvitationDetails(
            id=invitation.id,
            organization_id=org.id,
            organization_name=org.name,
            organization_slug=org.slug,
            email=invitation.email,
            role=invitation.role,
            inviter_name=invitation.invited_by_name,
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            is_expired=is_expired,
            is_accepted=is_accepted,
            is_revoked=is_revoked,
        )
