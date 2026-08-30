from uuid import UUID, uuid4

from starlette.testclient import TestClient

from feedio.entrypoints.api import create_app
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
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


def test_get_update_and_delete_project() -> None:
    organization_id = str(uuid4())
    projects_path = f"/api/v1/organizations/{organization_id}/projects"

    with create_test_client() as client:
        # Create
        created = client.post(
            projects_path,
            json={"name": "Brand Campaign", "description": "Q3 Launch"},
        )
        assert created.status_code == 201
        project_id = created.json()["id"]
        single_project_path = f"{projects_path}/{project_id}"

        # Get
        fetched = client.get(single_project_path)
        assert fetched.status_code == 200
        assert fetched.json()["name"] == "Brand Campaign"

        # Update
        updated = client.patch(
            single_project_path,
            json={"name": "Updated Campaign", "description": "Updated Desc"},
        )
        assert updated.status_code == 200
        assert updated.json()["name"] == "Updated Campaign"
        assert updated.json()["description"] == "Updated Desc"

        # Delete
        deleted = client.delete(single_project_path)
        assert deleted.status_code == 204

        # Get after delete returns 404
        after_delete = client.get(single_project_path)
        assert after_delete.status_code == 404


def test_folder_advanced_operations() -> None:
    organization_id = str(uuid4())
    projects_path = f"/api/v1/organizations/{organization_id}/projects"

    with create_test_client() as client:
        # Create Project
        created_proj = client.post(
            projects_path,
            json={"name": "Folder Test Project"},
        )
        assert created_proj.status_code == 201
        project_id = created_proj.json()["id"]
        folders_path = f"{projects_path}/{project_id}/folders"

        # Create Folder A and Folder B at root
        f_a = client.post(folders_path, json={"name": "Folder A"})
        assert f_a.status_code == 201
        f_a_id = f_a.json()["id"]

        f_b = client.post(folders_path, json={"name": "Folder B"})
        assert f_b.status_code == 201
        f_b_id = f_b.json()["id"]

        # Create Subfolder under A
        sub = client.post(folders_path, json={"name": "Sub", "parent_id": f_a_id})
        assert sub.status_code == 201
        sub_id = sub.json()["id"]

        # Get Single Folder
        fetched_sub = client.get(f"{folders_path}/{sub_id}")
        assert fetched_sub.status_code == 200
        assert fetched_sub.json()["name"] == "Sub"

        # Get Folder Tree
        tree = client.get(f"{folders_path}/tree")
        assert tree.status_code == 200
        assert len(tree.json()) == 3

        # Move Sub from A to B
        moved = client.post(f"{folders_path}/{sub_id}/move", json={"new_parent_id": f_b_id})
        assert moved.status_code == 200
        assert moved.json()["parent_id"] == f_b_id

        # Move B into Sub (Cycle rejection)
        cycle = client.post(f"{folders_path}/{f_b_id}/move", json={"new_parent_id": sub_id})
        assert cycle.status_code == 400

        # Move Sub to Root
        moved_root = client.post(f"{folders_path}/{sub_id}/move", json={"new_parent_id": None})
        assert moved_root.status_code == 200
        assert moved_root.json()["parent_id"] is None


def test_cookie_authenticated_write_requires_csrf_token() -> None:
    organization_id = str(uuid4())

    with create_test_client() as client:
        client.cookies.set("feedio_access_token", "access-token")
        response = client.post(
            f"/api/v1/organizations/{organization_id}/projects",
            json={"name": "Blocked write"},
        )

    assert response.status_code == 403
