from dataclasses import dataclass
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.organizations.domain.models import OrganizationSummary
from feedio.modules.organizations.presentation.router import create_organizations_router


@dataclass
class FakeCreateOrganization:
    created_by: UUID | None = None
    name: str | None = None

    async def execute(self, user_id: UUID, name: str) -> OrganizationSummary:
        self.created_by = user_id
        self.name = name
        return OrganizationSummary(uuid4(), name, "north-studio")


def test_verified_user_creates_workspace_during_onboarding() -> None:
    use_case = FakeCreateOrganization()
    user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)

    async def provide_use_case() -> FakeCreateOrganization:
        return use_case

    async def provide_user() -> CurrentUser:
        return user

    app = FastAPI()
    app.include_router(
        create_organizations_router(provide_use_case, provide_user),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.post("/api/v1/organizations", json={"name": "North Studio"})

    assert response.status_code == 201
    assert response.json()["name"] == "North Studio"
    assert use_case.created_by == user.id
