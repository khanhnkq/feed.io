from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.presentation.router import create_projects_router
from tests.fakes import InMemoryProjectRepository


def test_project_api_crud_and_members() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    user_id = uuid4()
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

    with TestClient(app) as client:
        # Create private project
        create_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects",
            json={
                "name": "Secret Campaign",
                "description": "Top secret project",
                "visibility": "private",
            },
        )
        assert create_resp.status_code == 201
        project_data = create_resp.json()
        assert project_data["name"] == "Secret Campaign"
        assert project_data["visibility"] == "private"
        project_id = project_data["id"]

        # List projects
        list_resp = client.get(f"/api/v1/organizations/{org_id}/projects")
        assert list_resp.status_code == 200
        assert len(list_resp.json()["items"]) == 1

        # Add member to private project
        collab_user_id = str(uuid4())
        add_member_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/members",
            json={
                "user_id": collab_user_id,
                "project_role": "editor",
            },
        )
        assert add_member_resp.status_code == 201
        assert add_member_resp.json()["user_id"] == collab_user_id
        assert add_member_resp.json()["project_role"] == "editor"

        # List members
        members_resp = client.get(f"/api/v1/organizations/{org_id}/projects/{project_id}/members")
        assert members_resp.status_code == 200
        assert len(members_resp.json()["items"]) >= 1

        # Update member role
        patch_resp = client.patch(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/members/{collab_user_id}",
            json={"project_role": "viewer"},
        )
        assert patch_resp.status_code == 204

        # Remove member
        del_member_resp = client.delete(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/members/{collab_user_id}"
        )
        assert del_member_resp.status_code == 204
