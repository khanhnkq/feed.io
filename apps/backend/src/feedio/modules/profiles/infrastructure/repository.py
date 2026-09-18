from uuid import UUID

from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.profiles.application.ports import ProfileRepository
from feedio.modules.profiles.domain.entities import ProfileRecord
from feedio.modules.profiles.domain.errors import ProfileNotFoundError
from feedio.modules.profiles.infrastructure.models import UserProfileTable


class SqlProfileRepository(ProfileRepository):
    """SQL-based profile repository backed by AsyncSession."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_user_id(self, user_id: UUID) -> ProfileRecord | None:
        statement = select(UserProfileTable).where(col(UserProfileTable.user_id) == user_id)
        result = await self._session.exec(statement)
        row = result.first()
        if row is None:
            user_stmt = select(UserTable).where(col(UserTable.id) == user_id)
            user_res = await self._session.exec(user_stmt)
            user_row = user_res.first()
            if user_row is None:
                return None
            row = UserProfileTable(
                user_id=user_id,
                display_name=user_row.email.split("@")[0],
                timezone="UTC",
                locale="en",
            )
            self._session.add(row)
            await self._session.commit()
            await self._session.refresh(row)
        return self._to_record(row)

    async def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        job_title: str | None,
        timezone: str | None,
        locale: str | None,
    ) -> ProfileRecord:
        statement = select(UserProfileTable).where(col(UserProfileTable.user_id) == user_id)
        result = await self._session.exec(statement)
        row = result.first()
        if row is None:
            raise ProfileNotFoundError(f"Profile for user {user_id} not found")

        if display_name is not None:
            row.display_name = display_name
        if job_title is not None:
            row.job_title = job_title
        if timezone is not None:
            row.timezone = timezone
        if locale is not None:
            row.locale = locale

        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_record(row)

    async def update_avatar_url(self, user_id: UUID, url: str | None) -> None:
        statement = select(UserProfileTable).where(col(UserProfileTable.user_id) == user_id)
        result = await self._session.exec(statement)
        row = result.first()
        if row is not None:
            row.avatar_url = url
            self._session.add(row)
            await self._session.commit()

    @staticmethod
    def _to_record(row: UserProfileTable) -> ProfileRecord:
        return ProfileRecord(
            id=row.id,
            user_id=row.user_id,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            job_title=row.job_title,
            timezone=row.timezone,
            locale=row.locale,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
