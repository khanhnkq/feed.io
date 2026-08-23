from dataclasses import dataclass
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
