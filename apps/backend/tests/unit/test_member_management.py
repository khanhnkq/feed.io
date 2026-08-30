from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from feedio.modules.organizations.application.invite_member import InviteMember
from feedio.modules.organizations.application.remove_member import RemoveMember
from feedio.modules.organizations.application.update_member_role import UpdateMemberRole
from feedio.modules.organizations.domain.entities import (
    OrganizationMember,
    OrganizationSummary,
)
from feedio.modules.organizations.domain.errors import (
    CannotChangeSoleOwnerRoleError,
    CannotRemoveSoleOwnerError,
    UserAlreadyMemberError,
    UserNotRegisteredError,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from tests.fake_organizations import InMemoryOrganizationRepository


class FakeOrganizationMailer:
    def __init__(self) -> None:
        self.sent_invitations: list[dict[str, object]] = []

    async def send_invitation(
        self,
        *,
        email: str,
        inviter_name: str,
        organization_name: str,
        role: OrganizationRole,
        token: str,
    ) -> None:
        self.sent_invitations.append(
            {
                "email": email,
                "inviter_name": inviter_name,
                "organization_name": organization_name,
                "role": role,
                "token": token,
            }
        )


@pytest.fixture
def test_setup() -> tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID]:
    repo = InMemoryOrganizationRepository()
    mailer = FakeOrganizationMailer()
    owner_id = uuid4()
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
    return repo, mailer, org.id, owner_id


async def test_invite_member_requires_registered_user(
    test_setup: tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID],
) -> None:
    repo, mailer, org_id, owner_id = test_setup
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    with pytest.raises(UserNotRegisteredError):
        await InviteMember(repo, mailer).execute(
            context=context,
            inviter_name="Acme Owner",
            email="unknown@agency.test",
            role=OrganizationRole.MEMBER,
        )


async def test_invite_member_success_sends_email(
    test_setup: tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID],
) -> None:
    repo, mailer, org_id, owner_id = test_setup
    invited_id = uuid4()
    repo.registered_users["colleague@acme.test"] = invited_id
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    invitation = await InviteMember(repo, mailer).execute(
        context=context,
        inviter_name="Acme Owner",
        email="colleague@acme.test",
        role=OrganizationRole.MEMBER,
    )

    assert invitation.email == "colleague@acme.test"
    assert len(mailer.sent_invitations) == 1
    assert mailer.sent_invitations[0]["email"] == "colleague@acme.test"


async def test_invite_member_prevents_existing_member(
    test_setup: tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID],
) -> None:
    repo, mailer, org_id, owner_id = test_setup
    repo.registered_users["owner@acme.test"] = owner_id
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    with pytest.raises(UserAlreadyMemberError):
        await InviteMember(repo, mailer).execute(
            context=context,
            inviter_name="Acme Owner",
            email="owner@acme.test",
            role=OrganizationRole.MEMBER,
        )


async def test_cannot_remove_sole_owner(
    test_setup: tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID],
) -> None:
    repo, _, org_id, owner_id = test_setup
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    with pytest.raises(CannotRemoveSoleOwnerError):
        await RemoveMember(repo).execute(context=context, target_user_id=owner_id)


async def test_cannot_demote_sole_owner(
    test_setup: tuple[InMemoryOrganizationRepository, FakeOrganizationMailer, UUID, UUID],
) -> None:
    repo, _, org_id, owner_id = test_setup
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)

    with pytest.raises(CannotChangeSoleOwnerRoleError):
        await UpdateMemberRole(repo).execute(
            context=context, target_user_id=owner_id, new_role=OrganizationRole.ADMIN
        )


def test_render_organization_invitation_email_html() -> None:
    from feedio.modules.organizations.infrastructure.email_templates import (
        render_organization_invitation_email,
    )

    text, html = render_organization_invitation_email(
        inviter_name="Alice <Admin>",
        organization_name="KLAB Agency",
        role=OrganizationRole.MEMBER,
        action_url="http://localhost:3000/invitations/xyz123",
    )

    assert "Alice &lt;Admin&gt;" in html
    assert "<strong>Alice &lt;Admin&gt;</strong>" in html
    assert "&lt;strong&gt;" not in html
    assert "<strong>KLAB Agency</strong>" in html
    assert "http://localhost:3000/invitations/xyz123" in html
