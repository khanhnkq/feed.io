from uuid import UUID

from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.errors import (
    CannotRemoveSoleOwnerError,
    InsufficientRolePermissionError,
    MemberNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class RemoveMember:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        target_user_id: UUID,
    ) -> None:
        is_self = context.user_id == target_user_id

        member = await self._repository.find_member(context.organization_id, target_user_id)
        if member is None or member.status != "active":
            raise MemberNotFoundError("Member not found")

        if member.organization_role == OrganizationRole.OWNER:
            owners_count = await self._repository.count_active_owners(context.organization_id)
            if owners_count <= 1:
                raise CannotRemoveSoleOwnerError("Cannot remove the only owner of an organization")

        if not is_self:
            if context.role == OrganizationRole.MEMBER:
                raise InsufficientRolePermissionError("Members cannot remove other members")
            if context.role == OrganizationRole.ADMIN and member.organization_role in (
                OrganizationRole.OWNER,
                OrganizationRole.ADMIN,
            ):
                raise InsufficientRolePermissionError("Admins cannot remove owners or other admins")

        await self._repository.remove_member(
            organization_id=context.organization_id,
            user_id=target_user_id,
        )
