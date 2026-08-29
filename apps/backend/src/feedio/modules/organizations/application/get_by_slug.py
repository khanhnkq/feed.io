from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationSummary


class GetOrganizationBySlug:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, slug: str, user_id: UUID) -> OrganizationSummary | None:
        return await self._repository.get_by_slug(slug, user_id)
