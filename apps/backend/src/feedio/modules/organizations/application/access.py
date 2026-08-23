from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationAccessRepository
from feedio.modules.organizations.domain.errors import OrganizationAccessDeniedError
from feedio.modules.organizations.domain.models import OrganizationContext


class AuthorizeOrganization:
    def __init__(self, repository: OrganizationAccessRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationContext:
        context = await self._repository.find_active_membership(organization_id, user_id)
        if context is None:
            raise OrganizationAccessDeniedError("Organization access denied")
        await self._repository.set_tenant_context(context)
        return context
