from uuid import UUID

from sqlalchemy import and_, delete, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.organizations.domain.entities import OrganizationMember
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.models import OrganizationMemberTable
from feedio.shared.domain.pagination import Page
from feedio.shared.infrastructure.pagination import decode_cursor, encode_cursor


class SqlOrganizationMemberRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_members(
        self,
        organization_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[OrganizationMember]:
        statement = (
            select(OrganizationMemberTable, UserTable.email, UserTable.display_name)
            .join(UserTable, col(OrganizationMemberTable.user_id) == col(UserTable.id))
            .where(
                col(OrganizationMemberTable.organization_id) == organization_id,
                col(OrganizationMemberTable.status) == "active",
                col(UserTable.status) == "active",
            )
        )

        if cursor:
            decoded = decode_cursor(cursor)
            if decoded:
                cur_joined_at, cur_user_id = decoded
                statement = statement.where(
                    or_(
                        col(OrganizationMemberTable.joined_at) < cur_joined_at,
                        and_(
                            col(OrganizationMemberTable.joined_at) == cur_joined_at,
                            col(OrganizationMemberTable.user_id) < cur_user_id,
                        ),
                    )
                )

        statement = statement.order_by(
            col(OrganizationMemberTable.joined_at).desc(),
            col(OrganizationMemberTable.user_id).desc(),
        ).limit(limit + 1)

        rows = list((await self._session.execute(statement)).all())
        has_more = len(rows) > limit
        items_rows = rows[:limit]
        items = [
            OrganizationMember(
                organization_id=member.organization_id,
                user_id=member.user_id,
                email=email,
                display_name=display_name,
                organization_role=OrganizationRole(member.organization_role),
                status=member.status,
                joined_at=member.joined_at,
            )
            for member, email, display_name in items_rows
        ]
        next_cursor = (
            encode_cursor(items_rows[-1][0].joined_at, items_rows[-1][0].user_id)
            if has_more and items_rows
            else None
        )
        return Page(items=items, next_cursor=next_cursor, has_more=has_more)

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
                col(OrganizationMemberTable.organization_role) == OrganizationRole.OWNER.value,
                col(OrganizationMemberTable.status) == "active",
            )
        )
        count: int = (await self._session.execute(statement)).scalar_one()
        return count
