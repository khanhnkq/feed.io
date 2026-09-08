import base64
from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from feedio.modules.notifications.application.ports import NotificationRepository
from feedio.modules.notifications.domain.entities import Notification
from feedio.modules.notifications.infrastructure.models import NotificationTable


class SqlAlchemyNotificationRepository(NotificationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, notification: Notification) -> Notification:
        table = NotificationTable.from_domain(notification)
        self._session.add(table)
        await self._session.flush()
        await self._session.refresh(table)
        await self._session.commit()
        return table.to_domain()

    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        stmt = select(NotificationTable).where(NotificationTable.id == notification_id)
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        return row.to_domain() if row else None

    async def list_for_user(
        self,
        user_id: UUID,
        organization_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Notification], str | None]:
        conditions = [NotificationTable.user_id == user_id]

        if organization_id is not None:
            conditions.append(NotificationTable.organization_id == organization_id)

        if unread_only:
            conditions.append(NotificationTable.read_at.is_(None))

        if cursor:
            try:
                decoded = base64.b64decode(cursor).decode("utf-8")
                cursor_created_at_str, cursor_id_str = decoded.split(":")
                cursor_created_at = datetime.fromisoformat(cursor_created_at_str)
                cursor_id = UUID(cursor_id_str)
                conditions.append(
                    (NotificationTable.created_at < cursor_created_at)
                    | (
                        and_(
                            NotificationTable.created_at == cursor_created_at,
                            NotificationTable.id < cursor_id,
                        )
                    )
                )
            except Exception:
                pass

        stmt = (
            select(NotificationTable)
            .where(and_(*conditions))
            .order_by(NotificationTable.created_at.desc(), NotificationTable.id.desc())
            .limit(limit + 1)
        )

        result = await self._session.execute(stmt)
        rows = list(result.scalars().all())

        next_cursor = None
        if len(rows) > limit:
            last_item = rows[limit - 1]
            cursor_payload = f"{last_item.created_at.isoformat()}:{last_item.id}"
            next_cursor = base64.b64encode(cursor_payload.encode("utf-8")).decode("utf-8")
            rows = rows[:limit]

        return [row.to_domain() for row in rows], next_cursor

    async def count_unread(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        conditions = [
            NotificationTable.user_id == user_id,
            NotificationTable.read_at.is_(None),
        ]
        if organization_id is not None:
            conditions.append(NotificationTable.organization_id == organization_id)

        stmt = select(func.count(NotificationTable.id)).where(and_(*conditions))
        result = await self._session.execute(stmt)
        return cast(int, result.scalar_one())

    async def mark_as_read(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        now = datetime.now(UTC)
        stmt = (
            update(NotificationTable)
            .where(
                and_(
                    NotificationTable.id == notification_id,
                    NotificationTable.user_id == user_id,
                    NotificationTable.read_at.is_(None),
                )
            )
            .values(read_at=now)
            .returning(NotificationTable)
        )
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        if row:
            await self._session.commit()
            return row.to_domain()
        return await self.get_by_id(notification_id)

    async def mark_all_as_read(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        now = datetime.now(UTC)
        conditions = [
            NotificationTable.user_id == user_id,
            NotificationTable.read_at.is_(None),
        ]
        if organization_id is not None:
            conditions.append(NotificationTable.organization_id == organization_id)

        stmt = (
            update(NotificationTable)
            .where(and_(*conditions))
            .values(read_at=now)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        return cast(int, result.rowcount)
