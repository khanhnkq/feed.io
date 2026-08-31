from dataclasses import dataclass
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.organizations.domain.entities import OrganizationSummary
from feedio.modules.organizations.presentation.router import create_organizations_router
from feedio.shared.domain.pagination import Page


@dataclass
class FakeCreateOrganization:
    created_by: UUID | None = None
    name: str | None = None

    async def execute(self, user_id: UUID, name: str) -> OrganizationSummary:
        self.created_by = user_id
        self.name = name
        return OrganizationSummary(uuid4(), name, "north-studio")


@dataclass
class FakeListOrganizations:
    listed_for: UUID | None = None

    async def execute(
        self,
        user_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[OrganizationSummary]:
        self.listed_for = user_id
        return Page(
            items=[OrganizationSummary(uuid4(), "North Studio", "north-studio")],
            next_cursor=None,
            has_more=False,
        )


@dataclass
class FakeGetOrganizationBySlug:
    allowed_user_id: UUID
    organization: OrganizationSummary

    async def execute(self, slug: str, user_id: UUID) -> OrganizationSummary | None:
        if slug == self.organization.slug and user_id == self.allowed_user_id:
            return self.organization
        return None


def test_verified_user_creates_organization_during_onboarding() -> None:
    use_case = FakeCreateOrganization()
    list_use_case = FakeListOrganizations()
    user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            lambda: use_case,
            lambda: list_use_case,
            lambda: user,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.post("/api/v1/organizations", json={"name": "North Studio"})

    assert response.status_code == 201
    assert response.json()["name"] == "North Studio"
    assert use_case.created_by == user.id


def test_user_lists_only_their_organizations() -> None:
    create_use_case = FakeCreateOrganization()
    list_use_case = FakeListOrganizations()
    user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            lambda: create_use_case,
            lambda: list_use_case,
            lambda: user,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/organizations")

    assert response.status_code == 200
    assert response.json()["items"][0]["slug"] == "north-studio"
    assert list_use_case.listed_for == user.id


def test_get_organization_by_slug_returns_200_for_member() -> None:
    create_use_case = FakeCreateOrganization()
    list_use_case = FakeListOrganizations()
    user = CurrentUser(uuid4(), "member@agency.test", "Member User", True)
    org_summary = OrganizationSummary(uuid4(), "North Studio", "north-studio")
    get_slug_use_case = FakeGetOrganizationBySlug(user.id, org_summary)

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            lambda: create_use_case,
            lambda: list_use_case,
            lambda: user,
            lambda: get_slug_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/organizations/by-slug/north-studio")

    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "north-studio"
    assert data["id"] == str(org_summary.id)


def test_get_organization_by_slug_returns_404_when_user_is_not_member() -> None:
    create_use_case = FakeCreateOrganization()
    list_use_case = FakeListOrganizations()
    authorized_user_id = uuid4()
    other_user = CurrentUser(uuid4(), "outsider@agency.test", "Outsider", True)
    org_summary = OrganizationSummary(uuid4(), "North Studio", "north-studio")
    get_slug_use_case = FakeGetOrganizationBySlug(authorized_user_id, org_summary)

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            lambda: create_use_case,
            lambda: list_use_case,
            lambda: other_user,
            lambda: get_slug_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/organizations/by-slug/north-studio")

    assert response.status_code == 404
    assert response.json()["detail"] == "Organization not found"


@dataclass
class FakeUpdateOrganization:
    async def execute(self, *, context: object, name: str) -> OrganizationSummary:
        return OrganizationSummary(uuid4(), name, "updated-slug")


@dataclass
class FakeDeleteOrganization:
    deleted: bool = False

    async def execute(self, context: object) -> None:
        self.deleted = True


@dataclass
class FakeLeaveOrganization:
    left_user_id: UUID | None = None

    async def execute(self, *, context: object, user_id: UUID) -> None:
        self.left_user_id = user_id


def test_update_organization_endpoint() -> None:
    update_use_case = FakeUpdateOrganization()
    user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)
    org_id = uuid4()

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            FakeCreateOrganization,
            FakeListOrganizations,
            lambda: user,
            context_provider=lambda: object(),
            update_organization_provider=lambda: update_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.patch(f"/api/v1/organizations/{org_id}", json={"name": "New Name"})

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_delete_organization_endpoint() -> None:
    delete_use_case = FakeDeleteOrganization()
    user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)
    org_id = uuid4()

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            FakeCreateOrganization,
            FakeListOrganizations,
            lambda: user,
            context_provider=lambda: object(),
            delete_organization_provider=lambda: delete_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.delete(f"/api/v1/organizations/{org_id}")

    assert response.status_code == 204
    assert delete_use_case.deleted is True


def test_leave_organization_endpoint() -> None:
    leave_use_case = FakeLeaveOrganization()
    user = CurrentUser(uuid4(), "member@agency.test", "Member", True)
    org_id = uuid4()

    app = FastAPI()
    app.include_router(
        create_organizations_router(
            FakeCreateOrganization,
            FakeListOrganizations,
            lambda: user,
            context_provider=lambda: object(),
            leave_organization_provider=lambda: leave_use_case,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.post(f"/api/v1/organizations/{org_id}/leave")

    assert response.status_code == 204
    assert leave_use_case.left_user_id == user.id
