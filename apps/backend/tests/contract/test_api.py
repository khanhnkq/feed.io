from uuid import UUID, uuid4

from starlette.testclient import TestClient

from feedio.entrypoints.api import create_app
from feedio.modules.organizations.domain.models import OrganizationContext, OrganizationRole
from tests.fake_health import FakeDependencyChecker
from tests.fakes import InMemoryProjectRepository


def create_test_client(dependencies_healthy: bool = True) -> TestClient:
    repository = InMemoryProjectRepository()
    checker = FakeDependencyChecker(dependencies_healthy)

    async def provide_repository() -> InMemoryProjectRepository:
        return repository

    async def provide_organization_context(
        organization_id: UUID,
    ) -> OrganizationContext:
        return OrganizationContext(
            organization_id=organization_id,
            user_id=uuid4(),
            role=OrganizationRole.MEMBER,
        )

    return TestClient(
        create_app(
            provide_repository,
            lambda: checker,
            organization_context_provider=provide_organization_context,
        )
    )


def test_liveness() -> None:
    with create_test_client() as client:
        response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_reports_every_dependency() -> None:
    with create_test_client() as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert set(response.json()["dependencies"]) == {
        "postgres",
        "valkey",
        "rabbitmq",
        "garage",
    }


def test_readiness_fails_when_a_dependency_is_down() -> None:
    with create_test_client(dependencies_healthy=False) as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"


def test_create_and_list_projects() -> None:
    organization_id = str(uuid4())
    projects_path = f"/api/v1/organizations/{organization_id}/projects"

    with create_test_client() as client:
        created = client.post(
            projects_path,
            json={"name": "Agency launch", "description": "First review organization"},
        )
        listed = client.get(projects_path)

    assert created.status_code == 201
    assert created.json()["name"] == "Agency launch"
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]


def test_cookie_authenticated_write_requires_csrf_token() -> None:
    organization_id = str(uuid4())

    with create_test_client() as client:
        client.cookies.set("feedio_access_token", "access-token")
        response = client.post(
            f"/api/v1/organizations/{organization_id}/projects",
            json={"name": "Blocked write"},
        )

    assert response.status_code == 403
