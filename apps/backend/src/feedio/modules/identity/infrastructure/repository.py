from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, delete, select, update

from feedio.modules.identity.domain.errors import InvalidActionTokenError
from feedio.modules.identity.domain.models import (
    CurrentUser,
    PlatformRole,
    SessionView,
    UserRecord,
)
from feedio.modules.identity.infrastructure.models import (
    AuthActionTokenTable,
    AuthSessionTable,
    UserTable,
)
from feedio.modules.organizations.infrastructure.models import OrganizationMemberTable
from feedio.shared.infrastructure.persistence import utc_now


class SqlAuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_user_by_email(self, email: str) -> UserRecord | None:
        row = await self._session.scalar(select(UserTable).where(UserTable.email == email))
        return _to_user_record(row) if row else None

    async def find_user_by_id(self, user_id: UUID) -> UserRecord | None:
        row = await self._session.get(UserTable, user_id)
        return _to_user_record(row) if row else None

    async def create_pending_user(
        self,
        *,
        email: str,
        password_hash: str,
        display_name: str,
    ) -> UserRecord:
        row = UserTable(
            email=email,
            password_hash=password_hash,
            display_name=display_name,
            status="pending_verification",
        )
        self._session.add(row)
        await self._session.commit()
        return _to_user_record(row)

    async def replace_action_token(
        self,
        *,
        user_id: UUID,
        purpose: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        await self._session.execute(
            delete(AuthActionTokenTable).where(
                col(AuthActionTokenTable.user_id) == user_id,
                col(AuthActionTokenTable.purpose) == purpose,
                col(AuthActionTokenTable.consumed_at).is_(None),
            )
        )
        self._session.add(
            AuthActionTokenTable(
                user_id=user_id,
                purpose=purpose,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        await self._session.commit()

    async def verify_email(self, token_hash: str) -> None:
        now = utc_now()
        token = await self._active_action_token(token_hash, "verify_email", now)
        user = await self._session.get(UserTable, token.user_id, with_for_update=True)
        if user is None:
            raise InvalidActionTokenError("Verification token is invalid")
        if user.email_verified_at is None:
            user.email_verified_at = now
            user.status = "active"
        token.consumed_at = now
        await self._session.commit()

    async def reset_password(self, token_hash: str, password_hash: str) -> None:
        now = utc_now()
        token = await self._active_action_token(token_hash, "reset_password", now)
        user = await self._session.get(UserTable, token.user_id, with_for_update=True)
        if user is None:
            raise InvalidActionTokenError("Reset token is invalid")
        user.password_hash = password_hash
        token.consumed_at = now
        await self._session.execute(
            update(AuthSessionTable)
            .where(
                col(AuthSessionTable.user_id) == user.id,
                col(AuthSessionTable.revoked_at).is_(None),
            )
            .values(revoked_at=now)
        )
        await self._session.commit()

    async def create_session(
        self,
        *,
        session_id: UUID,
        user_id: UUID,
        refresh_token_hash: str,
        user_agent: str | None,
        ip_address: str | None,
        expires_at: datetime,
    ) -> None:
        self._session.add(
            AuthSessionTable(
                id=session_id,
                user_id=user_id,
                refresh_token_hash=refresh_token_hash,
                user_agent=user_agent,
                ip_address=ip_address,
                expires_at=expires_at,
            )
        )
        await self._session.commit()

    async def rotate_session(
        self,
        *,
        session_id: UUID,
        presented_hash: str,
        replacement_hash: str,
        expires_at: datetime,
    ) -> bool:
        row = await self._session.scalar(
            select(AuthSessionTable)
            .where(AuthSessionTable.id == session_id)
            .with_for_update()
        )
        now = utc_now()
        if row is None or row.revoked_at is not None or row.expires_at <= now:
            return False
        if row.refresh_token_hash != presented_hash:
            row.revoked_at = now
            await self._session.commit()
            return False
        row.refresh_token_hash = replacement_hash
        row.expires_at = expires_at
        row.last_used_at = now
        await self._session.commit()
        return True

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        await self._session.execute(
            update(AuthSessionTable)
            .where(
                col(AuthSessionTable.id) == session_id,
                col(AuthSessionTable.user_id) == user_id,
                col(AuthSessionTable.revoked_at).is_(None),
            )
            .values(revoked_at=utc_now())
        )
        await self._session.commit()

    async def revoke_session_by_token(self, session_id: UUID) -> None:
        await self._session.execute(
            update(AuthSessionTable)
            .where(
                col(AuthSessionTable.id) == session_id,
                col(AuthSessionTable.revoked_at).is_(None),
            )
            .values(revoked_at=utc_now())
        )
        await self._session.commit()

    async def list_sessions(self, user_id: UUID, current_session_id: UUID) -> list[SessionView]:
        rows = (
            await self._session.scalars(
                select(AuthSessionTable)
                .where(
                    AuthSessionTable.user_id == user_id,
                    col(AuthSessionTable.revoked_at).is_(None),
                    AuthSessionTable.expires_at > utc_now(),
                )
                .order_by(col(AuthSessionTable.last_used_at).desc())
            )
        ).all()
        return [
            SessionView(row.id, row.user_agent, row.ip_address, row.id == current_session_id)
            for row in rows
        ]

    async def current_user(self, user_id: UUID) -> CurrentUser | None:
        row = await self._session.get(UserTable, user_id)
        if row is None or row.status != "active":
            return None
        membership = await self._session.scalar(
            select(OrganizationMemberTable.user_id)
            .where(
                OrganizationMemberTable.user_id == user_id,
                OrganizationMemberTable.status == "active",
            )
            .limit(1)
        )
        return CurrentUser(
            row.id,
            row.email,
            row.display_name,
            row.email_verified_at is not None,
            has_organization=membership is not None,
            platform_role=PlatformRole(row.platform_role),
        )

    async def _active_action_token(
        self,
        token_hash: str,
        purpose: str,
        now: datetime,
    ) -> AuthActionTokenTable:
        row = await self._session.scalar(
            select(AuthActionTokenTable)
            .where(
                AuthActionTokenTable.token_hash == token_hash,
                AuthActionTokenTable.purpose == purpose,
                col(AuthActionTokenTable.consumed_at).is_(None),
                AuthActionTokenTable.expires_at > now,
            )
            .with_for_update()
        )
        if row is None:
            raise InvalidActionTokenError("Action token is invalid or expired")
        return row


def _to_user_record(row: UserTable) -> UserRecord:
    return UserRecord(
        id=row.id,
        email=row.email,
        display_name=row.display_name,
        password_hash=row.password_hash,
        status=row.status,
        email_verified_at=row.email_verified_at,
        platform_role=PlatformRole(row.platform_role),
    )
