from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.organizations.domain.models import OrganizationContext, OrganizationRole
from feedio.modules.organizations.infrastructure.models import (
    OrganizationMemberTable,
    OrganizationTable,
)


class SqlOrganizationAccessRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_active_membership(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationContext | None:
        statement = (
            select(OrganizationMemberTable.organization_role)
            .join(
                OrganizationTable,
                col(OrganizationTable.id) == col(OrganizationMemberTable.organization_id),
            )
            .where(
                OrganizationMemberTable.organization_id == organization_id,
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
                OrganizationTable.status == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
        )
        role = (await self._session.execute(statement)).scalar_one_or_none()
        if role is None:
            return None
        return OrganizationContext(
            organization_id=organization_id,
            user_id=user_id,
            role=OrganizationRole(role),
        )

    async def find_first_active_membership(
        self,
        user_id: UUID,
    ) -> OrganizationContext | None:
        statement = (
            select(
                OrganizationMemberTable.organization_id,
                OrganizationMemberTable.organization_role,
            )
            .join(
                OrganizationTable,
                col(OrganizationTable.id) == col(OrganizationMemberTable.organization_id),
            )
            .where(
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
                OrganizationTable.status == "active",
                col(OrganizationTable.deleted_at).is_(None),
            )
            .order_by(
                col(OrganizationMemberTable.joined_at),
                col(OrganizationMemberTable.organization_id),
            )
            .limit(1)
        )
        row = (await self._session.execute(statement)).one_or_none()
        if row is None:
            return None
        return OrganizationContext(
            organization_id=row.organization_id,
            user_id=user_id,
            role=OrganizationRole(row.organization_role),
        )

    async def set_tenant_context(self, context: OrganizationContext) -> None:
        await self._session.execute(
            select(
                func.set_config(
                    "app.current_organization_id",
                    str(context.organization_id),
                    True,
                ),
                func.set_config("app.current_user_id", str(context.user_id), True),
            )
        )
