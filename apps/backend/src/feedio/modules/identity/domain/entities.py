from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from feedio.modules.identity.domain.value_objects import PlatformRole


@dataclass(frozen=True, slots=True)
class UserRecord:
    id: UUID
    email: str
    display_name: str
    password_hash: str
    status: str
    email_verified_at: datetime | None
    platform_role: PlatformRole = PlatformRole.USER


@dataclass(frozen=True, slots=True)
class SessionView:
    id: UUID
    user_agent: str | None
    ip_address: str | None
    current: bool
