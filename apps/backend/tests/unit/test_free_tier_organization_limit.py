"""Unit tests for Free tier 1-organization limit per owner."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.domain.entities import OrganizationMember, OrganizationSummary
from feedio.modules.organizations.domain.errors import FreeTierOrganizationLimitExceededError
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from tests.fake_organizations import InMemoryOrganizationRepository


@pytest.mark.asyncio
async def test_user_can_create_first_free_organization() -> None:
    repo = InMemoryOrganizationRepository()
    use_case = CreateOrganization(repo)
    user_id = uuid4()

    org = await use_case.execute(user_id=user_id, name="First Org")
    assert org.name == "First Org"
    assert org.plan_tier == "free"
    assert await repo.count_owned_free_organizations(user_id) == 1


@pytest.mark.asyncio
async def test_user_cannot_create_second_free_organization() -> None:
    repo = InMemoryOrganizationRepository()
    use_case = CreateOrganization(repo)
    user_id = uuid4()

    # First organization succeeds
    await use_case.execute(user_id=user_id, name="First Org")

    # Second organization creation must be rejected
    with pytest.raises(FreeTierOrganizationLimitExceededError) as exc_info:
        await use_case.execute(user_id=user_id, name="Second Org")

    assert "Free accounts can only own 1 organization" in str(exc_info.value)


@pytest.mark.asyncio
async def test_invited_member_can_still_create_their_own_organization() -> None:
    repo = InMemoryOrganizationRepository()
    use_case = CreateOrganization(repo)

    owner_a = uuid4()
    user_b = uuid4()

    # Owner A creates an organization
    org_a = await use_case.execute(user_id=owner_a, name="Owner A Org")

    # User B is added as a MEMBER of Org A (not owner)
    repo.members.append(
        OrganizationMember(
            organization_id=org_a.id,
            user_id=user_b,
            email="user_b@test.com",
            display_name="User B",
            organization_role=OrganizationRole.MEMBER,
            status="active",
            joined_at=datetime.now(UTC),
        )
    )

    # User B owns 0 free orgs, so User B CAN still create their own org
    org_b = await use_case.execute(user_id=user_b, name="User B Org")
    assert org_b.name == "User B Org"
    assert await repo.count_owned_free_organizations(user_b) == 1


@pytest.mark.asyncio
async def test_pro_user_can_create_another_organization() -> None:
    repo = InMemoryOrganizationRepository()
    use_case = CreateOrganization(repo)
    user_id = uuid4()

    # User creates their first org
    org_1 = await use_case.execute(user_id=user_id, name="Org 1")

    # Org 1 is upgraded to Pro
    repo.organizations[org_1.id] = OrganizationSummary(
        id=org_1.id,
        name=org_1.name,
        slug=org_1.slug,
        plan_tier="pro_100gb",
    )

    # User now has 0 free owned orgs (1 Pro owned org)
    assert await repo.count_owned_free_organizations(user_id) == 0

    # User can now create another org
    org_2 = await use_case.execute(user_id=user_id, name="Org 2")
    assert org_2.name == "Org 2"
