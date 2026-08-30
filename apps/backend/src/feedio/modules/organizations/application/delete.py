from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import InsufficientRolePermissionError
from feedio.modules.organizations.domain.value_objects import OrganizationContext


class DeleteOrganization:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, context: OrganizationContext) -> None:
        if context.role != "owner":
            raise InsufficientRolePermissionError(
                "Only the organization owner can delete the organization."
            )
        await self._repository.delete_organization(organization_id=context.organization_id)
