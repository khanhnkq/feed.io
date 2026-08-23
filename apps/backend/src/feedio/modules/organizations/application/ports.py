from typing import Protocol
from uuid import UUID

from feedio.modules.organizations.domain.models import OrganizationContext


class OrganizationAccessRepository(Protocol):
    async def find_active_membership(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationContext | None: ...

    async def find_first_active_membership(
        self,
        user_id: UUID,
    ) -> OrganizationContext | None: ...

    async def set_tenant_context(self, context: OrganizationContext) -> None: ...
