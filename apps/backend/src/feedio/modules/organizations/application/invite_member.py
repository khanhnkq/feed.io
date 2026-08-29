import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from feedio.modules.organizations.application.ports import (
    OrganizationMailer,
    OrganizationRepository,
)
from feedio.modules.organizations.domain.entities import OrganizationInvitation
from feedio.modules.organizations.domain.errors import (
    InsufficientRolePermissionError,
    UserAlreadyMemberError,
    UserNotRegisteredError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class InviteMember:
    def __init__(
        self,
        repository: OrganizationRepository,
        mailer: OrganizationMailer,
    ) -> None:
        self._repository = repository
        self._mailer = mailer

    async def execute(
        self,
        *,
        context: OrganizationContext,
        inviter_name: str,
        email: str,
        role: OrganizationRole,
    ) -> OrganizationInvitation:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientRolePermissionError(
                "Only owners and admins can invite members"
            )

        privileged_roles = (OrganizationRole.OWNER, OrganizationRole.ADMIN)
        if role in privileged_roles and context.role != OrganizationRole.OWNER:
            raise InsufficientRolePermissionError(
                "Only owners can invite administrators or owners"
            )

        normalized_email = email.strip().lower()
        if not await self._repository.is_user_registered_and_verified(
            normalized_email
        ):
            raise UserNotRegisteredError(
                "The user with this email has not registered or verified their account on Feed.io"
            )

        invited_user_id = await self._repository.find_user_id_by_email(
            normalized_email
        )
        if invited_user_id:
            existing = await self._repository.find_member(
                context.organization_id, invited_user_id
            )
            if existing and existing.status == "active":
                raise UserAlreadyMemberError(
                    "User is already an active member of this organization"
                )

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(UTC) + timedelta(days=7)

        org = await self._repository.get_by_id(
            context.organization_id, context.user_id
        )
        org_name = org.name if org else "Organization"

        invitation = await self._repository.create_invitation(
            organization_id=context.organization_id,
            email=normalized_email,
            role=role,
            token_hash=token_hash,
            invited_by_user_id=context.user_id,
            expires_at=expires_at,
        )

        await self._mailer.send_invitation(
            email=normalized_email,
            inviter_name=inviter_name,
            organization_name=org_name,
            role=role,
            token=raw_token,
        )

        return invitation
