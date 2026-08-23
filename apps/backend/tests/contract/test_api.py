from uuid import uuid4

from fastapi.testclient import TestClient

from feedio.entrypoints.api import create_app
from tests.fakes import InMemoryProjectRepository


def create_test_client() -> TestClient:
    repository = InMemoryProjectRepository()

    async def provide_repository() -> InMemoryProjectRepository:
        return repository

    return TestClient(create_app(provide_repository))


def test_liveness() -> None:
    with create_test_client() as client:
        response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_list_projects() -> None:
    organization_id = str(uuid4())
    headers = {"X-Organization-Id": organization_id}

    with create_test_client() as client:
        created = client.post(
            "/api/v1/projects",
            headers=headers,
            json={"name": "Agency launch", "description": "First review workspace"},
        )
        listed = client.get("/api/v1/projects", headers=headers)

    assert created.status_code == 201
    assert created.json()["name"] == "Agency launch"
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]
