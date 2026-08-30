from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from feedio.modules.organizations.application.accept_invitation import AcceptInvitation
from feedio.modules.organizations.domain.entities import (
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.errors import (
    InvitationEmailMismatchError,
    UserAlreadyMemberError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from tests.unit.test_member_management import (
    InMemoryOrganizationRepository,
)


@pytest.fixture
def acceptance_setup() -> tuple[InMemoryOrganizationRepository, UUID, UUID, UUID]:
    repo = InMemoryOrganizationRepository()
    owner_id = uuid4()
    invited_id = uuid4()
    wrong_user_id = uuid4()

    repo.registered_users["owner@acme.test"] = owner_id
    repo.registered_users["invited@acme.test"] = invited_id
    repo.registered_users["wrong@acme.test"] = wrong_user_id

    org = OrganizationSummary(uuid4(), "Acme Agency", "acme-agency")
    repo.organizations[org.id] = org
    repo.members.append(
        OrganizationMember(
            org.id,
            owner_id,
            "owner@acme.test",
            "Acme Owner",
            OrganizationRole.OWNER,
            "active",
            datetime.now(UTC),
        )
    )
    return repo, org.id, owner_id, invited_id


async def test_accept_invitation_rejects_email_mismatch(
    acceptance_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    import hashlib

    repo, org_id, owner_id, invited_id = acceptance_setup
    wrong_user_id = repo.registered_users["wrong@acme.test"]
    raw_token = "valid-token-for-invited"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    await repo.create_invitation(
        organization_id=org_id,
        email="invited@acme.test",
        role=OrganizationRole.MEMBER,
        token_hash=token_hash,
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    with pytest.raises(InvitationEmailMismatchError):
        await AcceptInvitation(repo).execute(raw_token=raw_token, user_id=wrong_user_id)


async def test_accept_invitation_rejects_existing_active_member(
    acceptance_setup: tuple[InMemoryOrganizationRepository, UUID, UUID, UUID],
) -> None:
    import hashlib

    repo, org_id, owner_id, _ = acceptance_setup
    raw_token = "valid-token-for-owner"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    await repo.create_invitation(
        organization_id=org_id,
        email="owner@acme.test",
        role=OrganizationRole.MEMBER,
        token_hash=token_hash,
        invited_by_user_id=owner_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )

    with pytest.raises(UserAlreadyMemberError):
        await AcceptInvitation(repo).execute(raw_token=raw_token, user_id=owner_id)
