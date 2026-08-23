from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.organizations.domain.models import OrganizationSummary


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
