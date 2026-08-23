from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.models import OrganizationSummary


class CreateOrganization:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, user_id: UUID, name: str) -> OrganizationSummary:
        return await self._repository.create_with_owner(
            user_id=user_id,
            name=name.strip(),
        )
