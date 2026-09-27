from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from feedio.modules.identity.domain.value_objects import PlatformRole


@dataclass(frozen=True, slots=True)
class UserRecord:
    id: UUID
    email: str
    password_hash: str | None
    status: str
    email_verified_at: datetime | None
    platform_role: PlatformRole = PlatformRole.USER


@dataclass(frozen=True, slots=True)
class AuthIdentityRecord:
    id: UUID
    user_id: UUID
    provider: str
    provider_user_id: str
    provider_email: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class GoogleUserInfo:
    sub: str
    email: str
    email_verified: bool
    name: str | None = None
    picture: str | None = None


@dataclass(frozen=True, slots=True)
class SessionView:
    id: UUID
    user_agent: str | None
    ip_address: str | None
    current: bool
