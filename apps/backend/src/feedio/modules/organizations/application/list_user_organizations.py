from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationSummary
from feedio.shared.domain.pagination import Page


class ListUserOrganizations:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        user_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[OrganizationSummary]:
        return await self._repository.list_for_user(user_id, cursor=cursor, limit=limit)
