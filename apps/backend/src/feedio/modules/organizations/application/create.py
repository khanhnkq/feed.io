from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.entities import OrganizationSummary
from feedio.modules.organizations.domain.errors import (
    FreeTierOrganizationLimitExceededError,
)


class CreateOrganization:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, user_id: UUID, name: str) -> OrganizationSummary:
        free_owned_count = await self._repository.count_owned_free_organizations(user_id)
        if free_owned_count >= 1:
            raise FreeTierOrganizationLimitExceededError(
                "Free accounts can only own 1 organization. Upgrade your current workspace to Pro to create additional organizations."
            )

        return await self._repository.create_with_owner(
            user_id=user_id,
            name=name.strip(),
        )

