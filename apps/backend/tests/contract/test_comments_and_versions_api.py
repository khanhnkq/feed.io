from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.comments.presentation.router import create_comments_router
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.presentation.router import create_media_router
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from feedio.shared.infrastructure.persistence import utc_now
from tests.comments_fakes import InMemoryCommentRepository
from tests.fakes import InMemoryProjectRepository
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


def test_comments_and_versions_api_contract() -> None:
    comment_repo = InMemoryCommentRepository()
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()

    org_id = uuid4()
    user_id = uuid4()
    proj_id = uuid4()
    version_group_id = uuid4()

    app = FastAPI()

    async def get_test_context() -> OrganizationContext:
        return OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        )

    media_router = create_media_router(
        media_repository_provider=lambda: media_repo,
        project_repository_provider=lambda: project_repo,
        storage_service_provider=lambda: storage,
        organization_context_provider=get_test_context,
    )
    comments_router = create_comments_router(
        comment_repository_provider=lambda: comment_repo,
        media_repository_provider=lambda: media_repo,
        project_repository_provider=lambda: project_repo,
        organization_context_provider=get_test_context,
    )

    app.include_router(media_router, prefix="/api/v1")
    app.include_router(comments_router, prefix="/api/v1")

    client = TestClient(app)

    # Seed Project
    project = Project(
        id=proj_id,
        organization_id=org_id,
        name="Review Project",
        description="",
        visibility="public",
        created_at=utc_now(),
    )
    project_repo.projects.append(project)

    # Seed Media V1 and V2
    m1_id = uuid4()
    m2_id = uuid4()

    m1 = MediaAsset(
        id=m1_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=user_id,
        title="Cut V1",
        filename="cut_v1.mp4",
        file_size_bytes=10_000_000,
        mime_type="video/mp4",
        storage_key=f"org/proj/media/{m1_id}/cut_v1.mp4",
        status="ready",
        version_group_id=version_group_id,
        version_number=1,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    m2 = MediaAsset(
        id=m2_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=user_id,
        title="Cut V2",
        filename="cut_v2.mp4",
        file_size_bytes=11_000_000,
        mime_type="video/mp4",
        storage_key=f"org/proj/media/{m2_id}/cut_v2.mp4",
        status="ready",
        version_group_id=version_group_id,
        version_number=2,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    media_repo.media_by_id[m1_id] = m1
    media_repo.media_by_id[m2_id] = m2

    # 1. Test Versions API
    ver_resp = client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/versions",
    )
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert len(ver_data) == 2
    assert ver_data[0]["version_number"] == 1
    assert ver_data[1]["version_number"] == 2

    # 2. Test Create Comment
    create_resp = client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/comments",
        json={
            "content": "Please trim head by 2 frames",
            "timestamp_seconds": 12.4,
            "frame_number": 298,
            "annotation_data": {"type": "rect", "x": 10, "y": 20, "width": 100, "height": 80},
        },
    )
    assert create_resp.status_code == 200
    comment_data = create_resp.json()
    comment_id = comment_data["id"]
    assert comment_data["content"] == "Please trim head by 2 frames"
    assert comment_data["timestamp_seconds"] == 12.4
    assert comment_data["status"] == "open"

    # 3. Test Create Reply Thread
    reply_resp = client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/comments",
        json={
            "content": "Done in V2!",
            "parent_comment_id": comment_id,
        },
    )
    assert reply_resp.status_code == 200

    # 4. Test List Comments (Nested structure)
    list_resp = client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/comments",
    )
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert len(list_data) == 1
    assert list_data[0]["id"] == comment_id
    assert len(list_data[0]["replies"]) == 1
    assert list_data[0]["replies"][0]["content"] == "Done in V2!"

    # 5. Test Update Comment Status (Resolve)
    patch_resp = client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/comments/{comment_id}",
        json={"status": "resolved"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "resolved"

    # 6. Test Delete Comment
    del_resp = client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{m1_id}/comments/{comment_id}",
    )
    assert del_resp.status_code == 204
