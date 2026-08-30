from uuid import uuid4

import pytest

from feedio.modules.organizations.application.delete import DeleteOrganization
from feedio.modules.organizations.application.leave import LeaveOrganization
from feedio.modules.organizations.application.update import UpdateOrganization
from feedio.modules.organizations.domain.errors import (
    CannotRemoveSoleOwnerError,
    InsufficientRolePermissionError,
    OrganizationAccessDeniedError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from tests.fake_organizations import InMemoryOrganizationRepository


@pytest.mark.asyncio
async def test_update_organization_by_owner() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=owner_id,
        role=OrganizationRole.OWNER,
    )
    use_case = UpdateOrganization(repo)
    updated = await use_case.execute(context=context, name="Acme Studios International")

    assert updated.name == "Acme Studios International"
    assert (await repo.get_by_id(org.id, owner_id)).name == "Acme Studios International"


@pytest.mark.asyncio
async def test_update_organization_forbidden_for_member() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    member_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=member_id,
        role=OrganizationRole.MEMBER,
    )
    use_case = UpdateOrganization(repo)
    with pytest.raises(InsufficientRolePermissionError):
        await use_case.execute(context=context, name="New Name")


@pytest.mark.asyncio
async def test_delete_organization_by_owner() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=owner_id,
        role=OrganizationRole.OWNER,
    )
    use_case = DeleteOrganization(repo)
    await use_case.execute(context=context)

    assert await repo.get_by_id(org.id, owner_id) is None


@pytest.mark.asyncio
async def test_delete_organization_forbidden_for_admin() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    admin_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=admin_id,
        role=OrganizationRole.ADMIN,
    )
    use_case = DeleteOrganization(repo)
    with pytest.raises(InsufficientRolePermissionError):
        await use_case.execute(context=context)


@pytest.mark.asyncio
async def test_leave_organization_sole_owner_error() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=owner_id,
        role=OrganizationRole.OWNER,
    )
    use_case = LeaveOrganization(repo)
    with pytest.raises(CannotRemoveSoleOwnerError):
        await use_case.execute(context=context, user_id=owner_id)


@pytest.mark.asyncio
async def test_leave_organization_mismatch_user_id() -> None:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    other_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Acme Studios")

    context = OrganizationContext(
        organization_id=org.id,
        user_id=owner_id,
        role=OrganizationRole.OWNER,
    )
    use_case = LeaveOrganization(repo)
    with pytest.raises(OrganizationAccessDeniedError):
        await use_case.execute(context=context, user_id=other_id)
