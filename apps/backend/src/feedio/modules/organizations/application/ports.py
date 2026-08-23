from typing import Protocol
from uuid import UUID

from feedio.modules.organizations.domain.models import OrganizationContext, OrganizationSummary


class OrganizationRepository(Protocol):
    async def create_with_owner(
        self,
        *,
        user_id: UUID,
        name: str,
    ) -> OrganizationSummary: ...

    async def list_for_user(self, user_id: UUID) -> list[OrganizationSummary]: ...

    async def get_by_slug(self, slug: str, user_id: UUID) -> OrganizationSummary | None: ...

    async def get_by_id(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationSummary | None: ...


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
