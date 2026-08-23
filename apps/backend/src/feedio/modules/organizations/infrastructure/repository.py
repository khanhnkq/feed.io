import re
import unicodedata
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.organizations.domain.models import OrganizationSummary
from feedio.modules.organizations.infrastructure.models import (
    OrganizationMemberTable,
    OrganizationTable,
)


class SqlOrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
                OrganizationTable.status == "active",
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
                OrganizationTable.slug == slug,
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
                OrganizationTable.status == "active",
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
                OrganizationTable.id == organization_id,
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
                OrganizationTable.status == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
        )
        row = (await self._session.execute(statement)).scalars().one_or_none()
        if row is None:
            return None
        return OrganizationSummary(row.id, row.name, row.slug)


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug[:80] or "org"
