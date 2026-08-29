from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationMember


class ListOrganizationMembers:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, organization_id: UUID) -> list[OrganizationMember]:
        return await self._repository.list_members(organization_id)
