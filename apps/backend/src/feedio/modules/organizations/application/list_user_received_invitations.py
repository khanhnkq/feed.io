from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.value_objects import (
    UserReceivedInvitationDetails,
)


class ListUserReceivedInvitations:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(self, *, email: str) -> list[UserReceivedInvitationDetails]:
        return await self._repository.list_active_invitations_for_email(email.strip().lower())
