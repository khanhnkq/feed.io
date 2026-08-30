from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import (
    CannotRemoveSoleOwnerError,
    OrganizationAccessDeniedError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext


class LeaveOrganization:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        user_id: UUID,
    ) -> None:
        if context.user_id != user_id:
            raise OrganizationAccessDeniedError("Cannot perform leave action for another user.")

        if context.role == "owner":
            owners_count = await self._repository.count_active_owners(context.organization_id)
            if owners_count <= 1:
                raise CannotRemoveSoleOwnerError(
                    "You are the sole owner. Transfer ownership or delete the organization."
                )

        await self._repository.remove_member(
            organization_id=context.organization_id,
            user_id=user_id,
        )
