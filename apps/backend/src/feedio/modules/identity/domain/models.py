from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class IdentityClaims:
    subject: str
    email: str
    display_name: str


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: UUID
    subject: str
    email: str
    display_name: str


@dataclass(frozen=True, slots=True)
class OidcTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int
