from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationSummary


class ListUserOrganizations:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, user_id: UUID) -> list[OrganizationSummary]:
        return await self._repository.list_for_user(user_id)
