from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.media.presentation.router import create_media_router
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from feedio.shared.infrastructure.persistence import utc_now
from tests.fakes import InMemoryProjectRepository
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


def test_media_api_lifecycle() -> None:
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()

    org_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()

    # Pre-create project
    project = Project(
        id=project_id,
        organization_id=org_id,
        name="Main Project",
        description="",
        visibility="public",
        created_at=utc_now(),
    )
    project_repo.projects.append(project)

    context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    app = FastAPI()
    app.include_router(
        create_media_router(
            media_repository_provider=lambda: media_repo,
            project_repository_provider=lambda: project_repo,
            storage_service_provider=lambda: storage,
            organization_context_provider=lambda: context,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        # 1. Presign Upload
        presign_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/presign-upload",
            json={
                "filename": "Scene_01_Draft.mp4",
                "file_size_bytes": 10485760,
                "mime_type": "video/mp4",
            },
        )
        assert presign_resp.status_code == 200
        presign_data = presign_resp.json()
        assert "upload_url" in presign_data
        media_id = presign_data["media_id"]

        # 2. Complete Upload
        complete_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}/complete",
        )
        assert complete_resp.status_code == 200
        assert complete_resp.json()["status"] == "ready"

        # 3. List Media
        list_resp = client.get(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media",
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()["items"]) == 1
        assert list_resp.json()["items"][0]["title"] == "Scene_01_Draft"

        # 4. Get Media & Stream URL
        get_resp = client.get(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}",
        )
        assert get_resp.status_code == 200
        assert "stream_url" in get_resp.json()

        # 5. Rename Media
        rename_resp = client.patch(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}",
            json={"title": "Scene 01 Final Cut"},
        )
        assert rename_resp.status_code == 200
        assert rename_resp.json()["title"] == "Scene 01 Final Cut"

        # 6. Delete Media
        del_resp = client.delete(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}",
        )
        assert del_resp.status_code == 204

        # Verify empty list after delete
        list_after_del = client.get(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media",
        )
        assert len(list_after_del.json()["items"]) == 0
