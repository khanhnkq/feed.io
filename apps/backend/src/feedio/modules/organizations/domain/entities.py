from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from feedio.modules.organizations.domain.value_objects import OrganizationRole


@dataclass(frozen=True, slots=True)
class OrganizationSummary:
    id: UUID
    name: str
    slug: str


@dataclass(frozen=True, slots=True)
class OrganizationMember:
    organization_id: UUID
    user_id: UUID
    email: str
    display_name: str
    organization_role: OrganizationRole
    status: str
    joined_at: datetime


@dataclass(frozen=True, slots=True)
class OrganizationInvitation:
    id: UUID
    organization_id: UUID
    email: str
    role: OrganizationRole
    invited_by_user_id: UUID | None
    invited_by_name: str | None
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
