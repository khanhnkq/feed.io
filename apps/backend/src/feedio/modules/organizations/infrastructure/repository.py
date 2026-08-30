import re
import unicodedata
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.errors import OrganizationNotFoundError
from feedio.modules.organizations.domain.value_objects import (
    OrganizationRole,
    UserReceivedInvitationDetails,
)
from feedio.modules.organizations.infrastructure.invitation_repository import (
    SqlOrganizationInvitationRepository,
)
from feedio.modules.organizations.infrastructure.member_repository import (
    SqlOrganizationMemberRepository,
)
from feedio.modules.organizations.infrastructure.models import (
    OrganizationMemberTable,
    OrganizationTable,
)
from feedio.shared.infrastructure.persistence import utc_now


class SqlOrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._members = SqlOrganizationMemberRepository(session)
        self._invitations = SqlOrganizationInvitationRepository(session)

    async def create_with_owner(
        self,
        *,
        user_id: UUID,
        name: str,
    ) -> OrganizationSummary:
        organization_id = uuid4()
        organization = OrganizationTable(
            id=organization_id,
            name=name,
            slug=f"{_slugify(name)}-{str(organization_id)[:8]}",
            created_by_user_id=user_id,
        )
        self._session.add(organization)
        await self._session.flush()
        self._session.add(
            OrganizationMemberTable(
                organization_id=organization_id,
                user_id=user_id,
                organization_role="owner",
            )
        )
        await self._session.commit()
        return OrganizationSummary(organization.id, organization.name, organization.slug)

    async def list_for_user(self, user_id: UUID) -> list[OrganizationSummary]:
        statement = (
            select(OrganizationTable)
            .join(
                OrganizationMemberTable,
                col(OrganizationTable.id) == col(OrganizationMemberTable.organization_id),
            )
            .where(
                col(OrganizationMemberTable.user_id) == user_id,
                col(OrganizationMemberTable.status) == "active",
                col(OrganizationTable.status) == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
            .order_by(col(OrganizationMemberTable.joined_at).asc())
        )
        rows = (await self._session.execute(statement)).scalars().all()
        return [OrganizationSummary(row.id, row.name, row.slug) for row in rows]

    async def get_by_slug(self, slug: str, user_id: UUID) -> OrganizationSummary | None:
        statement = (
            select(OrganizationTable)
            .join(
                OrganizationMemberTable,
                col(OrganizationTable.id) == col(OrganizationMemberTable.organization_id),
            )
            .where(
                col(OrganizationTable.slug) == slug,
                col(OrganizationMemberTable.user_id) == user_id,
                col(OrganizationMemberTable.status) == "active",
                col(OrganizationTable.status) == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
        )
        row = (await self._session.execute(statement)).scalars().one_or_none()
        if row is None:
            return None
        return OrganizationSummary(row.id, row.name, row.slug)

    async def get_by_id(self, organization_id: UUID, user_id: UUID) -> OrganizationSummary | None:
        statement = (
            select(OrganizationTable)
            .join(
                OrganizationMemberTable,
                col(OrganizationTable.id) == col(OrganizationMemberTable.organization_id),
            )
            .where(
                col(OrganizationTable.id) == organization_id,
                col(OrganizationMemberTable.user_id) == user_id,
                col(OrganizationMemberTable.status) == "active",
                col(OrganizationTable.status) == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
        )
        row = (await self._session.execute(statement)).scalars().one_or_none()
        if row is None:
            return None
        return OrganizationSummary(row.id, row.name, row.slug)

    async def update_organization(
        self,
        *,
        organization_id: UUID,
        name: str,
    ) -> OrganizationSummary:
        statement = select(OrganizationTable).where(
            col(OrganizationTable.id) == organization_id,
            col(OrganizationTable.deleted_at).is_(None),
        )
        row = (await self._session.execute(statement)).scalars().one_or_none()
        if row is None:
            raise OrganizationNotFoundError("Organization not found")
        row.name = name
        self._session.add(row)
        await self._session.commit()
        return OrganizationSummary(row.id, row.name, row.slug)

    async def delete_organization(self, *, organization_id: UUID) -> None:
        statement = select(OrganizationTable).where(
            col(OrganizationTable.id) == organization_id,
            col(OrganizationTable.deleted_at).is_(None),
        )
        row = (await self._session.execute(statement)).scalars().one_or_none()
        if row is None:
            raise OrganizationNotFoundError("Organization not found")
        row.deleted_at = utc_now()
        row.status = "suspended"
        self._session.add(row)
        await self._session.commit()

    # Delegate member operations
    async def list_members(self, organization_id: UUID) -> list[OrganizationMember]:
        return await self._members.list_members(organization_id)

    async def find_member(self, organization_id: UUID, user_id: UUID) -> OrganizationMember | None:
        return await self._members.find_member(organization_id, user_id)

    async def update_member_role(
        self, *, organization_id: UUID, user_id: UUID, new_role: OrganizationRole
    ) -> None:
        await self._members.update_member_role(
            organization_id=organization_id, user_id=user_id, new_role=new_role
        )

    async def remove_member(self, *, organization_id: UUID, user_id: UUID) -> None:
        await self._members.remove_member(organization_id=organization_id, user_id=user_id)

    async def count_active_owners(self, organization_id: UUID) -> int:
        return await self._members.count_active_owners(organization_id)

    # Delegate invitation operations
    async def is_user_registered_and_verified(self, email: str) -> bool:
        return await self._invitations.is_user_registered_and_verified(email)

    async def find_user_id_by_email(self, email: str) -> UUID | None:
        return await self._invitations.find_user_id_by_email(email)

    async def find_user_email_by_id(self, user_id: UUID) -> str | None:
        return await self._invitations.find_user_email_by_id(user_id)

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
        return await self._invitations.create_invitation(
            organization_id=organization_id,
            email=email,
            role=role,
            token_hash=token_hash,
            invited_by_user_id=invited_by_user_id,
            expires_at=expires_at,
        )

    async def list_active_invitations(self, organization_id: UUID) -> list[OrganizationInvitation]:
        return await self._invitations.list_active_invitations(organization_id)

    async def list_active_invitations_for_email(
        self, email: str
    ) -> list[UserReceivedInvitationDetails]:
        return await self._invitations.list_active_invitations_for_email(email)

    async def find_invitation_by_id(
        self, organization_id: UUID, invitation_id: UUID
    ) -> OrganizationInvitation | None:
        return await self._invitations.find_invitation_by_id(organization_id, invitation_id)

    async def find_invitation_by_id_only(
        self, invitation_id: UUID
    ) -> OrganizationInvitation | None:
        return await self._invitations.find_invitation_by_id_only(invitation_id)

    async def find_invitation_by_token_hash(
        self, token_hash: str
    ) -> tuple[OrganizationInvitation, OrganizationSummary] | None:
        return await self._invitations.find_invitation_by_token_hash(token_hash)

    async def revoke_invitation(self, *, organization_id: UUID, invitation_id: UUID) -> None:
        await self._invitations.revoke_invitation(
            organization_id=organization_id, invitation_id=invitation_id
        )

    async def decline_invitation(self, *, invitation_id: UUID) -> None:
        await self._invitations.decline_invitation(invitation_id=invitation_id)

    async def accept_invitation(self, *, invitation_id: UUID, user_id: UUID) -> OrganizationSummary:
        return await self._invitations.accept_invitation(
            invitation_id=invitation_id, user_id=user_id
        )


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug[:80] or "org"
