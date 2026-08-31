from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from feedio.modules.organizations.application.accept_user_invitation_direct import (
    AcceptUserInvitationDirect,
)
from feedio.modules.organizations.application.decline_user_invitation import (
    DeclineUserInvitation,
)
from feedio.modules.organizations.application.list_user_received_invitations import (
    ListUserReceivedInvitations,
)
from feedio.modules.organizations.domain.entities import (
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.errors import (
    InvitationEmailMismatchError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from tests.unit.test_member_management import InMemoryOrganizationRepository


@pytest.fixture
def user_invitation_setup() -> tuple[InMemoryOrganizationRepository, UUID, UUID, UUID]:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    user_id = uuid4()
    other_user_id = uuid4()

    repo.registered_users["owner@feed.io"] = owner_id
    repo.registered_users["alice@feed.io"] = user_id
    repo.registered_users["bob@feed.io"] = other_user_id

    org1 = OrganizationSummary(uuid4(), "Acme Corp", "acme-corp")
    org2 = OrganizationSummary(uuid4(), "Beta Team", "beta-team")
    repo.organizations[org1.id] = org1
    repo.organizations[org2.id] = org2

    repo.members.append(
        OrganizationMember(
            org1.id,
            owner_id,
            "owner@feed.io",
            "Owner User",
            OrganizationRole.OWNER,
            "active",
            datetime.now(UTC),
        )
    )
    repo.members.append(
        OrganizationMember(
            org2.id,
            owner_id,
            "owner@feed.io",
            "Owner User",
            OrganizationRole.OWNER,
            "active",
            datetime.now(UTC),
        )
    )
    return repo, org1.id, owner_id, user_id


async def test_list_user_received_invitations(
    user_invitation_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    repo, org_id, owner_id, user_id = user_invitation_setup

    # Create 2 invitations for alice and 1 for bob
    inv1 = await repo.create_invitation(
        organization_id=org_id,
        email="alice@feed.io",
        role=OrganizationRole.MEMBER,
        token_hash="hash-1",
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    await repo.create_invitation(
        organization_id=org_id,
        email="bob@feed.io",
        role=OrganizationRole.MEMBER,
        token_hash="hash-2",
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    use_case = ListUserReceivedInvitations(repo)
    results = await use_case.execute(email="alice@feed.io")

    assert len(results.items) == 1
    assert results.items[0].id == inv1.id
    assert results.items[0].organization_name == "Acme Corp"
    assert results.items[0].role == OrganizationRole.MEMBER


async def test_accept_user_invitation_direct_success(
    user_invitation_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    repo, org_id, owner_id, user_id = user_invitation_setup

    inv = await repo.create_invitation(
        organization_id=org_id,
        email="alice@feed.io",
        role=OrganizationRole.ADMIN,
        token_hash="hash-direct",
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    use_case = AcceptUserInvitationDirect(repo)
    result = await use_case.execute(invitation_id=inv.id, user_id=user_id)

    assert result.id == org_id
    # Member should now exist in repository
    member = await repo.find_member(org_id, user_id)
    assert member is not None
    assert member.organization_role == OrganizationRole.ADMIN


async def test_accept_user_invitation_direct_mismatch(
    user_invitation_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    repo, org_id, owner_id, user_id = user_invitation_setup
    bob_id = repo.registered_users["bob@feed.io"]

    inv = await repo.create_invitation(
        organization_id=org_id,
        email="alice@feed.io",
        role=OrganizationRole.MEMBER,
        token_hash="hash-alice",
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    use_case = AcceptUserInvitationDirect(repo)
    with pytest.raises(InvitationEmailMismatchError):
        await use_case.execute(invitation_id=inv.id, user_id=bob_id)


async def test_decline_user_invitation_success(
    user_invitation_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    repo, org_id, owner_id, user_id = user_invitation_setup

    inv = await repo.create_invitation(
        organization_id=org_id,
        email="alice@feed.io",
        role=OrganizationRole.MEMBER,
        token_hash="hash-decline",
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    use_case = DeclineUserInvitation(repo)
    await use_case.execute(invitation_id=inv.id, user_id=user_id)

    # After declining, list_active_invitations_for_email should return 0
    active = await repo.list_active_invitations_for_email("alice@feed.io")
    assert len(active.items) == 0
