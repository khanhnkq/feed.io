from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.value_objects import (
    InvitationDetails,
    OrganizationRole,
    UserReceivedInvitationDetails,
)


class CreateOrganizationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=120)


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str

    @classmethod
    def from_domain(cls, organization: OrganizationSummary) -> "OrganizationResponse":
        return cls(
            id=organization.id,
            name=organization.name,
            slug=organization.slug,
        )


class InviteMemberRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    role: OrganizationRole = Field(default=OrganizationRole.MEMBER)


class UpdateMemberRoleRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    role: OrganizationRole


class OrganizationMemberResponse(BaseModel):
    user_id: UUID
    organization_id: UUID
    email: str
    display_name: str
    organization_role: OrganizationRole
    status: str
    joined_at: datetime

    @classmethod
    def from_domain(cls, member: OrganizationMember) -> "OrganizationMemberResponse":
        return cls(
            user_id=member.user_id,
            organization_id=member.organization_id,
            email=member.email,
            display_name=member.display_name,
            organization_role=member.organization_role,
            status=member.status,
            joined_at=member.joined_at,
        )


class OrganizationInvitationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    email: str
    role: OrganizationRole
    invited_by_name: str | None
    created_at: datetime
    expires_at: datetime

    @classmethod
    def from_domain(cls, invitation: OrganizationInvitation) -> "OrganizationInvitationResponse":
        return cls(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            role=invitation.role,
            invited_by_name=invitation.invited_by_name,
            created_at=invitation.created_at,
            expires_at=invitation.expires_at,
        )


class PublicInvitationDetailsResponse(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    email: str
    role: OrganizationRole
    inviter_name: str | None
    is_expired: bool
    is_accepted: bool
    is_revoked: bool

    @classmethod
    def from_domain(cls, details: InvitationDetails) -> "PublicInvitationDetailsResponse":
        return cls(
            id=details.id,
            organization_id=details.organization_id,
            organization_name=details.organization_name,
            organization_slug=details.organization_slug,
            email=details.email,
            role=details.role,
            inviter_name=details.inviter_name,
            is_expired=details.is_expired,
            is_accepted=details.is_accepted,
            is_revoked=details.is_revoked,
        )


class UserReceivedInvitationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    role: OrganizationRole
    invited_by_name: str | None
    created_at: datetime
    expires_at: datetime

    @classmethod
    def from_domain(
        cls, details: UserReceivedInvitationDetails
    ) -> "UserReceivedInvitationResponse":
        return cls(
            id=details.id,
            organization_id=details.organization_id,
            organization_name=details.organization_name,
            organization_slug=details.organization_slug,
            role=details.role,
            invited_by_name=details.invited_by_name,
            created_at=details.created_at,
            expires_at=details.expires_at,
        )
