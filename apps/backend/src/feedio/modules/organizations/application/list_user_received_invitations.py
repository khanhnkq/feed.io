from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.value_objects import (
    UserReceivedInvitationDetails,
)
from feedio.shared.domain.pagination import Page


class ListUserReceivedInvitations:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        email: str,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[UserReceivedInvitationDetails]:
        return await self._repository.list_active_invitations_for_email(
            email.strip().lower(),
            cursor=cursor,
            limit=limit,
        )
