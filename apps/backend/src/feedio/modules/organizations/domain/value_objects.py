from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class OrganizationRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


@dataclass(frozen=True, slots=True)
class OrganizationContext:
    organization_id: UUID
    user_id: UUID
    role: OrganizationRole


@dataclass(frozen=True, slots=True)
class InvitationDetails:
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    email: str
    role: OrganizationRole
    inviter_name: str | None
    created_at: datetime
    expires_at: datetime
    is_expired: bool
    is_accepted: bool
    is_revoked: bool


@dataclass(frozen=True, slots=True)
class UserReceivedInvitationDetails:
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    role: OrganizationRole
    invited_by_name: str | None
    created_at: datetime
    expires_at: datetime
