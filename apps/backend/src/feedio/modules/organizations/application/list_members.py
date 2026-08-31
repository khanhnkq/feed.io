from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationMember
from feedio.shared.domain.pagination import Page


class ListOrganizationMembers:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[OrganizationMember]:
        return await self._repository.list_members(organization_id, cursor=cursor, limit=limit)
