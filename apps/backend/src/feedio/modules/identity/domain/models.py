from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: UUID
    email: str
    display_name: str
    email_verified: bool
    session_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class UserRecord:
    id: UUID
    email: str
    display_name: str
    password_hash: str
    status: str
    email_verified_at: datetime | None
    pending_workspace_name: str | None


@dataclass(frozen=True, slots=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: UUID
    session_id: UUID
    token_id: UUID


@dataclass(frozen=True, slots=True)
class SessionView:
    id: UUID
    user_agent: str | None
    ip_address: str | None
    current: bool
