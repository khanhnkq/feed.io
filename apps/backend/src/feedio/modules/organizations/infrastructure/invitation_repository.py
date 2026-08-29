from datetime import datetime
from uuid import UUID

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationRole,
    UserReceivedInvitationDetails,
)
from feedio.modules.organizations.infrastructure.models import (
    OrganizationInvitationTable,
    OrganizationMemberTable,
    OrganizationTable,
)
from feedio.shared.infrastructure.persistence import utc_now


def _format_inviter_display(
    display_name: str | None, email: str | None
) -> str | None:
    if email:
        return email.strip()
    return display_name.strip() if display_name else None


class SqlOrganizationInvitationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def is_user_registered_and_verified(self, email: str) -> bool:
        statement = select(UserTable.id).where(
            col(UserTable.email) == email,
            col(UserTable.email_verified_at).is_not(None),
            col(UserTable.status) == "active",
        )
        return (await self._session.scalar(statement)) is not None

    async def find_user_id_by_email(self, email: str) -> UUID | None:
        statement = select(UserTable.id).where(col(UserTable.email) == email)
        result = await self._session.scalar(statement)
        return result

    async def find_user_email_by_id(self, user_id: UUID) -> str | None:
        user = await self._session.get(UserTable, user_id)
        return user.email if user else None

    async def create_invitation(
        self,
        *,
        organization_id: UUID,
        email: str,
        role: OrganizationRole,
        token_hash: str,
        invited_by_user_id: UUID,
        expires_at: datetime,
    ) -> OrganizationInvitation:
        now = utc_now()
        await self._session.execute(
            update(OrganizationInvitationTable)
            .where(
                col(OrganizationInvitationTable.organization_id) == organization_id,
                col(OrganizationInvitationTable.email) == email,
                col(OrganizationInvitationTable.accepted_at).is_(None),
                col(OrganizationInvitationTable.revoked_at).is_(None),
            )
            .values(revoked_at=now)
        )

        inviter = await self._session.get(UserTable, invited_by_user_id)
        inviter_name = _format_inviter_display(
            inviter.display_name if inviter else None,
            inviter.email if inviter else None,
        )

        invitation = OrganizationInvitationTable(
            organization_id=organization_id,
            email=email,
            role=role.value,
            token_hash=token_hash,
            invited_by_user_id=invited_by_user_id,
            expires_at=expires_at,
        )
        self._session.add(invitation)
        await self._session.commit()
        await self._session.refresh(invitation)

        return OrganizationInvitation(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            role=OrganizationRole(invitation.role),
            invited_by_user_id=invitation.invited_by_user_id,
            invited_by_name=inviter_name,
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            revoked_at=invitation.revoked_at,
        )

    async def list_active_invitations(
        self,
        organization_id: UUID,
    ) -> list[OrganizationInvitation]:
        now = utc_now()
        inv_user_fk = col(OrganizationInvitationTable.invited_by_user_id)
        statement = (
            select(
                OrganizationInvitationTable,
                UserTable.display_name,
                UserTable.email,
            )
            .outerjoin(UserTable, inv_user_fk == col(UserTable.id))
            .where(
                col(OrganizationInvitationTable.organization_id) == organization_id,
                col(OrganizationInvitationTable.accepted_at).is_(None),
                col(OrganizationInvitationTable.revoked_at).is_(None),
                col(OrganizationInvitationTable.expires_at) > now,
            )
            .order_by(col(OrganizationInvitationTable.created_at).desc())
        )
        rows = (await self._session.execute(statement)).all()
        return [
            OrganizationInvitation(
                id=invitation.id,
                organization_id=invitation.organization_id,
                email=invitation.email,
                role=OrganizationRole(invitation.role),
                invited_by_user_id=invitation.invited_by_user_id,
                invited_by_name=_format_inviter_display(
                    inviter_name, inviter_email
                ),
                created_at=invitation.created_at,
                expires_at=invitation.expires_at,
                accepted_at=invitation.accepted_at,
                revoked_at=invitation.revoked_at,
            )
            for invitation, inviter_name, inviter_email in rows
        ]

    async def list_active_invitations_for_email(
        self,
        email: str,
    ) -> list[UserReceivedInvitationDetails]:
        now = utc_now()
        inv_org_fk = col(OrganizationInvitationTable.organization_id)
        inv_user_fk = col(OrganizationInvitationTable.invited_by_user_id)
        statement = (
            select(
                OrganizationInvitationTable,
                OrganizationTable,
                UserTable.display_name,
                UserTable.email,
            )
            .join(OrganizationTable, inv_org_fk == col(OrganizationTable.id))
            .outerjoin(UserTable, inv_user_fk == col(UserTable.id))
            .where(
                func.lower(col(OrganizationInvitationTable.email))
                == email.strip().lower(),
                col(OrganizationInvitationTable.accepted_at).is_(None),
                col(OrganizationInvitationTable.revoked_at).is_(None),
                col(OrganizationInvitationTable.expires_at) > now,
            )
            .order_by(col(OrganizationInvitationTable.created_at).desc())
        )
        rows = (await self._session.execute(statement)).all()
        return [
            UserReceivedInvitationDetails(
                id=invitation.id,
                organization_id=org.id,
                organization_name=org.name,
                organization_slug=org.slug,
                role=OrganizationRole(invitation.role),
                invited_by_name=_format_inviter_display(
                    inviter_name, inviter_email
                ),
                created_at=invitation.created_at,
                expires_at=invitation.expires_at,
            )
            for invitation, org, inviter_name, inviter_email in rows
        ]

    async def find_invitation_by_id(
        self,
        organization_id: UUID,
        invitation_id: UUID,
    ) -> OrganizationInvitation | None:
        inv_user_fk = col(OrganizationInvitationTable.invited_by_user_id)
        statement = (
            select(
                OrganizationInvitationTable,
                UserTable.display_name,
                UserTable.email,
            )
            .outerjoin(UserTable, inv_user_fk == col(UserTable.id))
            .where(
                col(OrganizationInvitationTable.organization_id) == organization_id,
                col(OrganizationInvitationTable.id) == invitation_id,
            )
        )
        row = (await self._session.execute(statement)).first()
        if row is None:
            return None
        invitation, inviter_name, inviter_email = row
        return OrganizationInvitation(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            role=OrganizationRole(invitation.role),
            invited_by_user_id=invitation.invited_by_user_id,
            invited_by_name=_format_inviter_display(inviter_name, inviter_email),
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            revoked_at=invitation.revoked_at,
        )

    async def find_invitation_by_id_only(
        self,
        invitation_id: UUID,
    ) -> OrganizationInvitation | None:
        inv_user_fk = col(OrganizationInvitationTable.invited_by_user_id)
        statement = (
            select(
                OrganizationInvitationTable,
                UserTable.display_name,
                UserTable.email,
            )
            .outerjoin(UserTable, inv_user_fk == col(UserTable.id))
            .where(col(OrganizationInvitationTable.id) == invitation_id)
        )
        row = (await self._session.execute(statement)).first()
        if row is None:
            return None
        invitation, inviter_name, inviter_email = row
        return OrganizationInvitation(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            role=OrganizationRole(invitation.role),
            invited_by_user_id=invitation.invited_by_user_id,
            invited_by_name=_format_inviter_display(inviter_name, inviter_email),
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            revoked_at=invitation.revoked_at,
        )

    async def find_invitation_by_token_hash(
        self,
        token_hash: str,
    ) -> tuple[OrganizationInvitation, OrganizationSummary] | None:
        inv_org_fk = col(OrganizationInvitationTable.organization_id)
        inv_user_fk = col(OrganizationInvitationTable.invited_by_user_id)
        statement = (
            select(
                OrganizationInvitationTable,
                OrganizationTable,
                UserTable.display_name,
                UserTable.email,
            )
            .join(OrganizationTable, inv_org_fk == col(OrganizationTable.id))
            .outerjoin(UserTable, inv_user_fk == col(UserTable.id))
            .where(col(OrganizationInvitationTable.token_hash) == token_hash)
        )
        row = (await self._session.execute(statement)).first()
        if row is None:
            return None
        invitation, org, inviter_name, inviter_email = row
        inv_entity = OrganizationInvitation(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            role=OrganizationRole(invitation.role),
            invited_by_user_id=invitation.invited_by_user_id,
            invited_by_name=_format_inviter_display(inviter_name, inviter_email),
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            revoked_at=invitation.revoked_at,
        )
        org_summary = OrganizationSummary(id=org.id, name=org.name, slug=org.slug)
        return inv_entity, org_summary

    async def revoke_invitation(
        self,
        *,
        organization_id: UUID,
        invitation_id: UUID,
    ) -> None:
        await self._session.execute(
            update(OrganizationInvitationTable)
            .where(
                col(OrganizationInvitationTable.organization_id) == organization_id,
                col(OrganizationInvitationTable.id) == invitation_id,
            )
            .values(revoked_at=utc_now())
        )
        await self._session.commit()

    async def decline_invitation(
        self,
        *,
        invitation_id: UUID,
    ) -> None:
        await self._session.execute(
            update(OrganizationInvitationTable)
            .where(col(OrganizationInvitationTable.id) == invitation_id)
            .values(revoked_at=utc_now())
        )
        await self._session.commit()

    async def accept_invitation(
        self,
        *,
        invitation_id: UUID,
        user_id: UUID,
    ) -> OrganizationSummary:
        now = utc_now()
        invitation = await self._session.get(
            OrganizationInvitationTable,
            invitation_id,
            with_for_update=True,
        )
        if invitation is None:
            raise ValueError("Invitation not found")

        invitation.accepted_at = now

        existing_member = await self._session.get(
            OrganizationMemberTable,
            (invitation.organization_id, user_id),
            with_for_update=True,
        )
        if existing_member:
            if existing_member.status != "active":
                existing_member.status = "active"
                existing_member.organization_role = invitation.role
        else:
            self._session.add(
                OrganizationMemberTable(
                    organization_id=invitation.organization_id,
                    user_id=user_id,
                    organization_role=invitation.role,
                    status="active",
                    joined_at=now,
                )
            )

        org = await self._session.get(OrganizationTable, invitation.organization_id)
        if org is None:
            raise ValueError("Organization not found")

        await self._session.commit()
        return OrganizationSummary(id=org.id, name=org.name, slug=org.slug)
