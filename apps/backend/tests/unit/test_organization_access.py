from uuid import uuid4

import pytest

from feedio.modules.organizations.application.access import AuthorizeOrganization
from feedio.modules.organizations.domain.errors import OrganizationAccessDeniedError
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class FakeOrganizationAccessRepository:
    def __init__(self, context: OrganizationContext | None) -> None:
        self.context = context
        self.tenant_context_was_set = False

    async def find_active_membership(
        self,
        organization_id: object,
        user_id: object,
    ) -> OrganizationContext | None:
        return self.context

    async def set_tenant_context(self, context: OrganizationContext) -> None:
        assert context == self.context
        self.tenant_context_was_set = True


async def test_authorizes_member_before_setting_transaction_tenant_context() -> None:
    context = OrganizationContext(
        organization_id=uuid4(),
        user_id=uuid4(),
        role=OrganizationRole.MEMBER,
    )
    repository = FakeOrganizationAccessRepository(context)

    result = await AuthorizeOrganization(repository).execute(
        context.organization_id,
        context.user_id,
    )

    assert result == context
    assert repository.tenant_context_was_set is True


async def test_denies_non_member_without_setting_tenant_context() -> None:
    repository = FakeOrganizationAccessRepository(None)

    with pytest.raises(OrganizationAccessDeniedError):
        await AuthorizeOrganization(repository).execute(uuid4(), uuid4())

    assert repository.tenant_context_was_set is False
