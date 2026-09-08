from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.modules.media.domain.entities import MediaAsset, MediaReviewDecision
from feedio.modules.media.presentation.decisions_router import create_media_decisions_router
from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.notifications.infrastructure.repository import (
    SqlAlchemyNotificationRepository,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from tests.unit.test_notifications import InMemoryNotificationRepository


@pytest.mark.asyncio
async def test_create_media_decision_updates_status_and_dispatches_realtime_and_notification():
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    author_id = uuid4()
    reviewer_id = uuid4()

    mock_media_repo = AsyncMock()
    mock_project_repo = AsyncMock()
    mock_publisher = AsyncMock()
    notification_repo = InMemoryNotificationRepository()
    notification_service = NotificationServiceImpl(
        repository=notification_repo,
        event_publisher=mock_publisher,
    )

    mock_project_repo.get_by_id.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Project X",
        description="",
        created_at=datetime.now(UTC),
    )

    mock_media_repo.get_by_id.return_value = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=author_id,
        title="Hero_Cut_v2.mp4",
        filename="hero.mp4",
        file_size_bytes=1000,
        mime_type="video/mp4",
        storage_key="keys/hero.mp4",
        status="ready",
        review_status="pending",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_media_repo.record_decision.return_value = MediaReviewDecision(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=reviewer_id,
        status="approved",
        notes="Flawless cut!",
        created_at=datetime.now(UTC),
        user_name="Reviewer Bob",
    )

    app = FastAPI()
    router = create_media_decisions_router(
        media_repository_provider=lambda: mock_media_repo,
        project_repository_provider=lambda: mock_project_repo,
        organization_context_provider=lambda: OrganizationContext(
            organization_id=org_id,
            user_id=reviewer_id,
            role=OrganizationRole.MEMBER,
        ),
        event_publisher_provider=lambda: mock_publisher,
        notification_service_provider=lambda: notification_service,
    )
    app.include_router(
        router,
        prefix="/api/v1/organizations/{organization_id}/projects/{project_id}/media",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/decisions",
            json={"status": "approved", "notes": "Flawless cut!"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "approved"
        assert data["notes"] == "Flawless cut!"

        # Verify repo status update was invoked
        mock_media_repo.update_review_status.assert_awaited_once_with(
            organization_id=org_id,
            project_id=proj_id,
            media_id=media_id,
            status="approved",
            reviewed_by_user_id=reviewer_id,
        )

        # Verify realtime event was broadcast
        assert mock_publisher.publish.await_count >= 1
        published_events = [call.args[0] for call in mock_publisher.publish.await_args_list]
        decision_events = [e for e in published_events if e.event_type == "decision.updated"]
        assert len(decision_events) == 1
        assert decision_events[0].room == f"media:{media_id}"
        assert decision_events[0].payload["status"] == "approved"

        # Verify notification was sent to asset creator
        notifications, _ = await notification_repo.list_for_user(author_id, org_id)
        assert len(notifications) == 1
        assert notifications[0].type == NotificationType.REVIEW_DECISION
        assert "Approved" in notifications[0].title
        assert "Hero_Cut_v2.mp4" in notifications[0].message


@pytest.mark.asyncio
async def test_list_media_decisions():
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    user_id = uuid4()

    mock_media_repo = AsyncMock()
    mock_project_repo = AsyncMock()

    mock_project_repo.get_by_id.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Project X",
        description="",
        created_at=datetime.now(UTC),
    )

    mock_media_repo.list_decisions.return_value = [
        MediaReviewDecision(
            id=uuid4(),
            organization_id=org_id,
            project_id=proj_id,
            media_id=media_id,
            user_id=user_id,
            status="approved",
            notes="LGTM",
            created_at=datetime.now(UTC),
            user_name="Marcus",
        )
    ]

    app = FastAPI()
    router = create_media_decisions_router(
        media_repository_provider=lambda: mock_media_repo,
        project_repository_provider=lambda: mock_project_repo,
        organization_context_provider=lambda: OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.MEMBER,
        ),
    )
    app.include_router(
        router,
        prefix="/api/v1/organizations/{organization_id}/projects/{project_id}/media",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/decisions"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["status"] == "approved"
        assert data["items"][0]["user_name"] == "Marcus"
