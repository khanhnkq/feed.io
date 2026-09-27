"""Unit tests for Free tier 5-member limit and Pro tier unlimited members."""

from uuid import UUID, uuid4

import pytest

from feedio.modules.organizations.application.invite_member import InviteMember
from feedio.modules.organizations.domain.entities import OrganizationSummary
from feedio.modules.organizations.domain.errors import FreeTierMemberLimitExceededError
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from tests.fake_organizations import (
    FakeOrganizationMailer,
    InMemoryOrganizationRepository,
)


@pytest.mark.asyncio
async def test_free_tier_capped_at_five_members() -> None:
    repo = InMemoryOrganizationRepository()
    mailer = FakeOrganizationMailer()
    owner_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Free Workspace")
    org_id = org.id
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    invite_use_case = InviteMember(repo, mailer)

    # Org currently has 1 member (owner).
    # Can invite 4 more members (reaching 5 total)
    for i in range(1, 5):
        email = f"member{i}@test.com"
        repo.registered_users[email] = uuid4()
        await invite_use_case.execute(
            context=context,
            inviter_name="Owner",
            email=email,
            role=OrganizationRole.MEMBER,
        )

    # Total active + pending is now 5
    assert await repo.count_total_members_and_pending(org_id) == 5

    # 6th invitation attempt must fail with FreeTierMemberLimitExceededError
    email_6 = "member6@test.com"
    repo.registered_users[email_6] = uuid4()
    with pytest.raises(FreeTierMemberLimitExceededError) as exc_info:
        await invite_use_case.execute(
            context=context,
            inviter_name="Owner",
            email=email_6,
            role=OrganizationRole.MEMBER,
        )
    assert "Free workspaces are limited to 5 members" in str(exc_info.value)


@pytest.mark.asyncio
async def test_pro_tier_allows_unlimited_members() -> None:
    repo = InMemoryOrganizationRepository()
    mailer = FakeOrganizationMailer()
    owner_id = uuid4()
    org = await repo.create_with_owner(user_id=owner_id, name="Pro Workspace")
    org_id = org.id

    # Upgrade org to pro_100gb
    repo.organizations[org_id] = OrganizationSummary(
        id=org.id,
        name=org.name,
        slug=org.slug,
        plan_tier="pro_100gb",
        storage_quota_bytes=100 * 1024 * 1024 * 1024,
    )
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)
    invite_use_case = InviteMember(repo, mailer)

    # Can invite 10 members without any limit
    for i in range(1, 11):
        email = f"pro_member{i}@test.com"
        repo.registered_users[email] = uuid4()
        await invite_use_case.execute(
            context=context,
            inviter_name="Owner",
            email=email,
            role=OrganizationRole.MEMBER,
        )

    assert len(mailer.sent_invitations) == 10
