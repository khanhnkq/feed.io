from datetime import datetime
from typing import Protocol
from uuid import UUID

from feedio.modules.identity.domain.entities import SessionView, UserRecord
from feedio.modules.identity.domain.value_objects import (
    AuthTokens,
    CurrentUser,
    TokenClaims,
)


class PasswordManager(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password: str, password_hash: str) -> bool: ...


class TokenManager(Protocol):
    def issue(self, user_id: UUID, session_id: UUID) -> AuthTokens: ...

    def verify_access(self, token: str) -> TokenClaims: ...

    def verify_refresh(self, token: str) -> TokenClaims: ...


class AuthMailer(Protocol):
    async def send_verification(self, email: str, display_name: str, token: str) -> None: ...

    async def send_password_reset(self, email: str, display_name: str, token: str) -> None: ...


class AuthRepository(Protocol):
    async def find_user_by_email(self, email: str) -> UserRecord | None: ...

    async def find_user_by_id(self, user_id: UUID) -> UserRecord | None: ...

    async def create_pending_user(
        self,
        *,
        email: str,
        password_hash: str,
        display_name: str,
    ) -> UserRecord: ...

    async def replace_action_token(
        self,
        *,
        user_id: UUID,
        purpose: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None: ...

    async def verify_email(self, token_hash: str) -> None: ...

    async def reset_password(self, token_hash: str, password_hash: str) -> None: ...

    async def create_session(
        self,
        *,
        session_id: UUID,
        user_id: UUID,
        refresh_token_hash: str,
        user_agent: str | None,
        ip_address: str | None,
        expires_at: datetime,
    ) -> None: ...

    async def rotate_session(
        self,
        *,
        session_id: UUID,
        presented_hash: str,
        replacement_hash: str,
        expires_at: datetime,
    ) -> bool: ...

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None: ...

    async def revoke_session_by_token(self, session_id: UUID) -> None: ...

    async def list_sessions(self, user_id: UUID, current_session_id: UUID) -> list[SessionView]: ...

    async def current_user(self, user_id: UUID) -> CurrentUser | None: ...
