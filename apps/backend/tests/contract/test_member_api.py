from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.organizations.domain.entities import (
    OrganizationInvitation,
    OrganizationMember,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.organizations.presentation.router import create_organizations_router


class FakeMembersUseCase:
    def __init__(self, members: list[OrganizationMember]) -> None:
        self.members = members

    async def execute(self, organization_id: UUID) -> list[OrganizationMember]:
        return self.members


class FakeInviteUseCase:
    def __init__(self) -> None:
        self.last_invite: dict[str, object] | None = None

    async def execute(
        self,
        *,
        context: OrganizationContext,
        inviter_name: str,
        email: str,
        role: OrganizationRole,
    ) -> OrganizationInvitation:
        self.last_invite = {
            "org_id": context.organization_id,
            "email": email,
            "role": role,
            "inviter_name": inviter_name,
        }
        return OrganizationInvitation(
            id=uuid4(),
            organization_id=context.organization_id,
            email=email,
            role=role,
            invited_by_user_id=context.user_id,
            invited_by_name=inviter_name,
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC),
        )


def test_list_and_invite_members_api_contract() -> None:
    org_id = uuid4()
    owner_id = uuid4()
    context = OrganizationContext(org_id, owner_id, OrganizationRole.OWNER)
    current_user = CurrentUser(owner_id, "owner@agency.test", "Owner User", True)

    members_use_case = FakeMembersUseCase(
        [
            OrganizationMember(
                org_id,
                owner_id,
                "owner@agency.test",
                "Owner User",
                OrganizationRole.OWNER,
                "active",
                datetime.now(UTC),
            )
        ]
    )
    invite_use_case = FakeInviteUseCase()

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            create_organization_provider=lambda: None,  # type: ignore[arg-type]
            list_organizations_provider=lambda: None,  # type: ignore[arg-type]
            current_user_provider=lambda: current_user,
            context_provider=lambda: context,
            list_members_provider=lambda: members_use_case,
            invite_member_provider=lambda: invite_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        list_res = client.get(f"/api/v1/organizations/{org_id}/members")
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["email"] == "owner@agency.test"

        invite_res = client.post(
            f"/api/v1/organizations/{org_id}/invitations",
            json={"email": "designer@agency.test", "role": "member"},
        )
        assert invite_res.status_code == 201
        assert invite_use_case.last_invite is not None
        assert invite_use_case.last_invite["email"] == "designer@agency.test"
