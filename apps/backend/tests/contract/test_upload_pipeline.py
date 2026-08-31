from uuid import UUID, uuid4

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
from tests.media_fakes import (
    InMemoryMediaRepository,
    InMemoryStorageService,
)


class FakeJobPublisher:
    def __init__(self) -> None:
        self.published_jobs: list[dict] = []

    async def publish_transcode_job(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> None:
        self.published_jobs.append(
            {
                "organization_id": organization_id,
                "project_id": project_id,
                "media_id": media_id,
                "storage_key": storage_key,
                "filename": filename,
                "mime_type": mime_type,
            }
        )


def test_multipart_upload_pipeline_lifecycle() -> None:
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()
    publisher = FakeJobPublisher()

    org_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()

    project = Project(
        id=project_id,
        organization_id=org_id,
        name="Cinema Project",
        description="4K Raw Footage",
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
            job_publisher_provider=lambda: publisher,
        ),
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        # 1. Initiate Multipart Upload for 100MB video file
        initiate_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/multipart/initiate",
            json={
                "filename": "Final_Cut_4K.mov",
                "file_size_bytes": 100 * 1024 * 1024,
                "mime_type": "video/quicktime",
                "has_thumbnail": True,
            },
        )
        assert initiate_resp.status_code == 200
        init_data = initiate_resp.json()
        assert init_data["upload_id"] == "mock-upload-id"
        assert init_data["total_parts"] == 5
        media_id = init_data["media_id"]
        assert init_data["thumbnail_upload_url"] is not None

        # 2. Presign parts (parts 1, 2, 3)
        presign_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}/multipart/presign-parts",
            json={
                "upload_id": "mock-upload-id",
                "part_numbers": [1, 2, 3],
            },
        )
        assert presign_resp.status_code == 200
        presign_data = presign_resp.json()
        assert len(presign_data["parts"]) == 3
        assert presign_data["parts"][0]["part_number"] == 1
        assert "upload_url" in presign_data["parts"][0]

        # 3. Complete Multipart Upload
        complete_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}/multipart/complete",
            json={
                "upload_id": "mock-upload-id",
                "parts": [
                    {"part_number": 1, "etag": "etag-1"},
                    {"part_number": 2, "etag": "etag-2"},
                    {"part_number": 3, "etag": "etag-3"},
                    {"part_number": 4, "etag": "etag-4"},
                    {"part_number": 5, "etag": "etag-5"},
                ],
            },
        )
        assert complete_resp.status_code == 200
        complete_data = complete_resp.json()
        assert complete_data["status"] == "processing"
        assert len(publisher.published_jobs) == 1
        assert str(publisher.published_jobs[0]["media_id"]) == media_id


def test_multipart_upload_abort_flow() -> None:
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()

    org_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()

    project = Project(
        id=project_id,
        organization_id=org_id,
        name="Abort Test Project",
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
        # 1. Initiate
        init_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/multipart/initiate",
            json={
                "filename": "Cancelled_Video.mp4",
                "file_size_bytes": 50 * 1024 * 1024,
                "mime_type": "video/mp4",
            },
        )
        assert init_resp.status_code == 200
        media_id = init_resp.json()["media_id"]

        # 2. Abort
        abort_resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/{media_id}/multipart/abort",
            json={"upload_id": "mock-upload-id"},
        )
        assert abort_resp.status_code == 200
        abort_data = abort_resp.json()
        assert abort_data["status"] == "aborted"
        assert media_repo.media_by_id[UUID(media_id)].deleted_at is not None


def test_upload_validations_and_unsupported_mime_type() -> None:
    media_repo = InMemoryMediaRepository()
    project_repo = InMemoryProjectRepository()
    storage = InMemoryStorageService()

    org_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()

    project = Project(
        id=project_id,
        organization_id=org_id,
        name="Validation Project",
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
        # Invalid mime type rejected with 400
        resp = client.post(
            f"/api/v1/organizations/{org_id}/projects/{project_id}/media/multipart/initiate",
            json={
                "filename": "Malicious.exe",
                "file_size_bytes": 1024,
                "mime_type": "application/x-msdos-program",
            },
        )
        assert resp.status_code == 400
        assert "Unsupported media format" in resp.json()["detail"]
