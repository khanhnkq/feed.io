from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from feedio.modules.projects.presentation.router import create_projects_router
from feedio.shared.infrastructure.persistence import utc_now
from tests.fakes import InMemoryProjectRepository


def create_folder_test_client() -> tuple[TestClient, InMemoryProjectRepository, str, str]:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()

    # Pre-populate project
    project = Project(
        id=project_id,
        organization_id=org_id,
        name="Test Media Project",
        description="For folder tests",
        visibility="public",
        created_at=utc_now(),
    )
    repo.projects.append(project)

    context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    app = FastAPI()
    app.include_router(
        create_projects_router(
            repository_provider=lambda: repo,
            organization_context_provider=lambda: context,
        ),
        prefix="/api/v1",
    )

    return TestClient(app), repo, str(org_id), str(project_id)


def test_folder_crud_contract() -> None:
    client, repo, org_id, project_id = create_folder_test_client()
    folders_base = f"/api/v1/organizations/{org_id}/projects/{project_id}/folders"

    # 1. Create root folder
    res_root = client.post(folders_base, json={"name": "VFX Shots"})
    assert res_root.status_code == 201
    root_data = res_root.json()
    assert root_data["name"] == "VFX Shots"
    assert root_data["parent_id"] is None
    root_id = root_data["id"]

    # 2. Duplicate root folder name returns 409
    res_dup = client.post(folders_base, json={"name": "VFX Shots"})
    assert res_dup.status_code == 409

    # 3. Invalid folder name (empty or whitespace) returns 422 or 400
    res_inv = client.post(folders_base, json={"name": "   "})
    assert res_inv.status_code in (400, 422)

    # 4. Non-existent parent_id returns 404
    fake_parent = str(uuid4())
    res_404 = client.post(folders_base, json={"name": "Child", "parent_id": fake_parent})
    assert res_404.status_code == 404

    # 5. Create nested child folder
    res_child = client.post(folders_base, json={"name": "Shot 010", "parent_id": root_id})
    assert res_child.status_code == 201
    child_data = res_child.json()
    assert child_data["parent_id"] == root_id
    child_id = child_data["id"]

    # 6. List folders at root vs at child
    list_root = client.get(folders_base)
    assert list_root.status_code == 200
    assert len(list_root.json()["items"]) == 1
    assert list_root.json()["items"][0]["id"] == root_id

    list_sub = client.get(f"{folders_base}?parent_id={root_id}")
    assert list_sub.status_code == 200
    assert len(list_sub.json()["items"]) == 1
    assert list_sub.json()["items"][0]["id"] == child_id

    # 7. Get single folder
    res_get = client.get(f"{folders_base}/{child_id}")
    assert res_get.status_code == 200
    assert res_get.json()["name"] == "Shot 010"

    # 8. Rename folder
    res_rename = client.patch(f"{folders_base}/{child_id}", json={"name": "Shot 010 Final"})
    assert res_rename.status_code == 200
    assert res_rename.json()["name"] == "Shot 010 Final"

    # 9. Breadcrumbs
    res_crumbs = client.get(f"{folders_base}/{child_id}/breadcrumbs")
    assert res_crumbs.status_code == 200
    crumbs = res_crumbs.json()
    assert len(crumbs) == 2
    assert crumbs[0]["name"] == "VFX Shots"
    assert crumbs[1]["name"] == "Shot 010 Final"

    # 10. Folder Tree
    res_tree = client.get(f"{folders_base}/tree")
    assert res_tree.status_code == 200
    tree = res_tree.json()
    assert len(tree) == 2


def test_folder_move_and_cycle_prevention() -> None:
    client, repo, org_id, project_id = create_folder_test_client()
    folders_base = f"/api/v1/organizations/{org_id}/projects/{project_id}/folders"

    # Hierarchy: A -> B -> C, and separate D
    res_a = client.post(folders_base, json={"name": "Folder A"})
    a_id = res_a.json()["id"]

    res_b = client.post(folders_base, json={"name": "Folder B", "parent_id": a_id})
    b_id = res_b.json()["id"]

    res_c = client.post(folders_base, json={"name": "Folder C", "parent_id": b_id})
    c_id = res_c.json()["id"]

    res_d = client.post(folders_base, json={"name": "Folder D"})
    d_id = res_d.json()["id"]

    # Move C to D
    res_move = client.post(f"{folders_base}/{c_id}/move", json={"new_parent_id": d_id})
    assert res_move.status_code == 200
    assert res_move.json()["parent_id"] == d_id

    # Move A into itself -> cycle error (400)
    res_self = client.post(f"{folders_base}/{a_id}/move", json={"new_parent_id": a_id})
    assert res_self.status_code == 400
    assert "itself" in res_self.json()["detail"].lower()

    # Move A into descendant B -> cycle error (400)
    res_cycle = client.post(f"{folders_base}/{a_id}/move", json={"new_parent_id": b_id})
    assert res_cycle.status_code == 400
    assert "subfolder" in res_cycle.json()["detail"].lower()

    # Move B to Root
    res_to_root = client.post(f"{folders_base}/{b_id}/move", json={"new_parent_id": None})
    assert res_to_root.status_code == 200
    assert res_to_root.json()["parent_id"] is None

    # Delete folder A
    res_del = client.delete(f"{folders_base}/{a_id}")
    assert res_del.status_code == 204

    # Verify A is deleted
    res_get_del = client.get(f"{folders_base}/{a_id}")
    assert res_get_del.status_code == 404
