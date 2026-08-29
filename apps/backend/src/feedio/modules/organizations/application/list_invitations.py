from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationInvitation
from feedio.modules.organizations.domain.errors import InsufficientRolePermissionError
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class ListOrganizationInvitations:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, context: OrganizationContext) -> list[OrganizationInvitation]:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientRolePermissionError("Only owners and admins can view invitations")
        return await self._repository.list_active_invitations(context.organization_id)
