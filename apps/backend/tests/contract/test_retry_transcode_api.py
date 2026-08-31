from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.presentation.router import create_media_router
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from feedio.shared.infrastructure.persistence import utc_now
from tests.fakes import InMemoryProjectRepository
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


class FakeJobPublisher:
    def __init__(self) -> None:
        self.published_jobs: list[dict] = []

    async def publish_transcode_job(
        self,
        organization_id: object,
        project_id: object,
        media_id: object,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> None:
        self.published_jobs.append(
            {
                "media_id": str(media_id),
                "storage_key": storage_key,
                "filename": filename,
                "mime_type": mime_type,
            }
        )


def test_retry_transcode_and_progress_endpoints() -> None:
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()
    publisher = FakeJobPublisher()

    org_id = uuid4()
    user_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    app = FastAPI()

    async def get_test_context() -> OrganizationContext:
        return OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        )

    router = create_media_router(
        media_repository_provider=lambda: media_repo,
        project_repository_provider=lambda: project_repo,
        storage_service_provider=lambda: storage,
        organization_context_provider=get_test_context,
        job_publisher_provider=lambda: publisher,
    )
    app.include_router(router, prefix="/api/v1")

    client = TestClient(app)

    # Seed Project
    project = Project(
        id=proj_id,
        organization_id=org_id,
        name="Transcode Test Project",
        description="",
        visibility="public",
        created_at=utc_now(),
    )
    project_repo.projects.append(project)

    # Seed Failed Media
    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=user_id,
        title="Failed Video Cut",
        filename="cut.mov",
        file_size_bytes=10_000_000,
        mime_type="video/quicktime",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/cut.mov",
        status="failed",
        error_message="FFmpeg memory error",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    media_repo.media_by_id[media_id] = media

    # 1. Query progress for failed media
    prog_resp = client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/transcode-progress",
    )
    assert prog_resp.status_code == 200
    prog_data = prog_resp.json()
    assert prog_data["status"] == "failed"
    assert prog_data["progress_percent"] == 0

    # 2. Retry transcode
    retry_resp = client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/retry-transcode",
    )
    assert retry_resp.status_code == 200
    retry_data = retry_resp.json()
    assert retry_data["status"] == "processing"
    assert len(publisher.published_jobs) == 1
    assert publisher.published_jobs[0]["media_id"] == str(media_id)

    # 3. Check progress when ready
    media_repo.media_by_id[media_id] = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=user_id,
        title="Failed Video Cut",
        filename="cut.mov",
        file_size_bytes=10_000_000,
        mime_type="video/quicktime",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/cut.mov",
        status="ready",
        created_at=utc_now(),
        updated_at=utc_now(),
    )

    prog_ready_resp = client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/transcode-progress",
    )
    assert prog_ready_resp.status_code == 200
    ready_data = prog_ready_resp.json()
    assert ready_data["status"] == "ready"
    assert ready_data["progress_percent"] == 100
