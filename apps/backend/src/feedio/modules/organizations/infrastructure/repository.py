import re
import unicodedata
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from feedio.modules.organizations.domain.models import OrganizationSummary
from feedio.modules.organizations.infrastructure.models import (
    OrganizationMemberTable,
    OrganizationTable,
)


class SqlOrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_owner_workspace(
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
                role="owner",
            )
        )
        await self._session.commit()
        return OrganizationSummary(organization.id, organization.name, organization.slug)


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug[:80] or "workspace"
