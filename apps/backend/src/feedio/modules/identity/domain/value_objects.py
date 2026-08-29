from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class PlatformRole(StrEnum):
    USER = "user"
    SUPPORT = "support"
    SUPER_ADMIN = "super_admin"


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: UUID
    email: str
    display_name: str
    email_verified: bool
    has_organization: bool = False
    platform_role: PlatformRole = PlatformRole.USER
    session_id: UUID | None = None


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
