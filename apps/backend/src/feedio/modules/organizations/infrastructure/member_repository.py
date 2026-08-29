from uuid import UUID

from sqlalchemy import delete, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.organizations.domain.entities import OrganizationMember
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.models import OrganizationMemberTable


class SqlOrganizationMemberRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_members(self, organization_id: UUID) -> list[OrganizationMember]:
        statement = (
            select(OrganizationMemberTable, UserTable.email, UserTable.display_name)
            .join(UserTable, col(OrganizationMemberTable.user_id) == col(UserTable.id))
            .where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.status) == "active",
                col(UserTable.status) == "active",
            )
            .order_by(col(OrganizationMemberTable.joined_at).asc())
        )
        rows = (await self._session.execute(statement)).all()
        return [
            OrganizationMember(
                organization_id=member.organization_id,
                user_id=member.user_id,
                email=email,
                display_name=display_name,
                organization_role=OrganizationRole(member.organization_role),
                status=member.status,
                joined_at=member.joined_at,
            )
            for member, email, display_name in rows
        ]

    async def find_member(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationMember | None:
        statement = (
            select(OrganizationMemberTable, UserTable.email, UserTable.display_name)
            .join(UserTable, col(OrganizationMemberTable.user_id) == col(UserTable.id))
            .where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.user_id) == user_id,
            )
        )
        row = (await self._session.execute(statement)).first()
        if row is None:
            return None
        member, email, display_name = row
        return OrganizationMember(
            organization_id=member.organization_id,
            user_id=member.user_id,
            email=email,
            display_name=display_name,
            organization_role=OrganizationRole(member.organization_role),
            status=member.status,
            joined_at=member.joined_at,
        )

    async def update_member_role(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
        new_role: OrganizationRole,
    ) -> None:
        await self._session.execute(
            update(OrganizationMemberTable)
            .where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.user_id) == user_id,
            )
            .values(organization_role=new_role.value)
        )
        await self._session.commit()

    async def remove_member(
        self,
        *,
        organization_id: UUID,
        user_id: UUID,
    ) -> None:
        await self._session.execute(
            delete(OrganizationMemberTable).where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.user_id) == user_id,
            )
        )
        await self._session.commit()

    async def count_active_owners(self, organization_id: UUID) -> int:
        statement = (
            select(func.count())
            .select_from(OrganizationMemberTable)
            .where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.organization_role)
                == OrganizationRole.OWNER.value,
                col(OrganizationMemberTable.status) == "active",
            )
        )
        count: int = (await self._session.execute(statement)).scalar_one()
        return count
