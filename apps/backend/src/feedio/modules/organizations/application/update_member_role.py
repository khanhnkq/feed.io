from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import (
    CannotChangeSoleOwnerRoleError,
    InsufficientRolePermissionError,
    MemberNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class UpdateMemberRole:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        target_user_id: UUID,
        new_role: OrganizationRole,
    ) -> None:
        if context.role != OrganizationRole.OWNER:
            raise InsufficientRolePermissionError("Only owners can change member roles")

        member = await self._repository.find_member(context.organization_id, target_user_id)
        if member is None or member.status != "active":
            raise MemberNotFoundError("Member not found")

        is_owner = member.organization_role == OrganizationRole.OWNER
        if is_owner and new_role != OrganizationRole.OWNER:
            owners_count = await self._repository.count_active_owners(context.organization_id)
            if owners_count <= 1:
                raise CannotChangeSoleOwnerRoleError("Cannot change the role of the only owner")

        await self._repository.update_member_role(
            organization_id=context.organization_id,
            user_id=target_user_id,
            new_role=new_role,
        )
