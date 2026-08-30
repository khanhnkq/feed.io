from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationSummary
from feedio.modules.organizations.domain.errors import InsufficientRolePermissionError
from feedio.modules.organizations.domain.value_objects import OrganizationContext


class UpdateOrganization:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        name: str,
    ) -> OrganizationSummary:
        if context.role not in ("owner", "admin"):
            raise InsufficientRolePermissionError(
                "Only organization owners and admins can update organization details."
            )
        cleaned_name = name.strip()
        if not cleaned_name:
            raise ValueError("Organization name cannot be empty.")
        return await self._repository.update_organization(
            organization_id=context.organization_id,
            name=cleaned_name,
        )
