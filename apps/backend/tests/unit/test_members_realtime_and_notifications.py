from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.entities import OrganizationMember
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.organizations.presentation.members_router import create_members_router
from feedio.modules.projects.domain.entities import Project, ProjectMember
from feedio.modules.projects.presentation.project_members_router import (
    create_project_members_router,
)
from tests.unit.test_notifications import InMemoryNotificationRepository


@pytest.mark.asyncio
async def test_project_member_addition_and_role_update_dispatches_realtime_and_notification():
    org_id = uuid4()
    proj_id = uuid4()
    actor_id = uuid4()
    target_user_id = uuid4()

    mock_project_repo = AsyncMock()
    mock_publisher = AsyncMock()
    notification_repo = InMemoryNotificationRepository()
    notification_service = NotificationServiceImpl(
        repository=notification_repo,
        event_publisher=mock_publisher,
    )

    now = datetime.now(UTC)
    mock_project_repo.get.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Phase 3 Project",
        description="",
        created_at=now,
    )
    mock_project_repo.is_user_project_member.return_value = False
    mock_project_repo.add_project_member.return_value = ProjectMember(
        project_id=proj_id,
        user_id=target_user_id,
        project_role="editor",
        email="test@feedio.dev",
        display_name="Test User",
        created_at=now,
    )

    app = FastAPI()

    async def override_context():
        return OrganizationContext(
            organization_id=org_id,
            user_id=actor_id,
            role=OrganizationRole.ADMIN,
        )

    router = create_project_members_router(
        repository_provider=lambda: mock_project_repo,
        organization_context_provider=override_context,
        event_publisher_provider=lambda: mock_publisher,
        notification_service_provider=lambda: notification_service,
    )
    app.include_router(router, prefix="/api/v1/projects")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Add project member
        resp_add = await client.post(
            f"/api/v1/projects/{proj_id}/members",
            json={"user_id": str(target_user_id), "project_role": "editor"},
        )
        assert resp_add.status_code == 201
        assert mock_publisher.publish.called

        # Verify in-app notification created for target user
        notifications, _, _ = await notification_service.list_notifications(user_id=target_user_id)
        assert len(notifications) == 1
        assert notifications[0].type == NotificationType.PROJECT_ACCESS_GRANTED
        assert "editor" in notifications[0].message

        # 2. Update project member role
        mock_publisher.reset_mock()
        mock_project_repo.is_user_project_member.return_value = True
        resp_patch = await client.patch(
            f"/api/v1/projects/{proj_id}/members/{target_user_id}",
            json={"project_role": "viewer"},
        )
        assert resp_patch.status_code == 204

        notifications, _, _ = await notification_service.list_notifications(user_id=target_user_id)
        assert len(notifications) == 2
        assert notifications[0].type == NotificationType.ROLE_UPDATED
        assert "viewer" in notifications[0].message


@pytest.mark.asyncio
async def test_organization_member_role_update_dispatches_realtime_and_notification():
    org_id = uuid4()
    actor_id = uuid4()
    target_user_id = uuid4()

    mock_use_case = AsyncMock()
    mock_publisher = AsyncMock()
    notification_repo = InMemoryNotificationRepository()
    notification_service = NotificationServiceImpl(
        repository=notification_repo,
        event_publisher=mock_publisher,
    )

    app = FastAPI()

    async def override_context():
        return OrganizationContext(
            organization_id=org_id,
            user_id=actor_id,
            role=OrganizationRole.OWNER,
        )

    router = create_members_router(
        context_provider=override_context,
        update_member_role_provider=lambda: mock_use_case,
        event_publisher_provider=lambda: mock_publisher,
        notification_service_provider=lambda: notification_service,
    )
    app.include_router(router, prefix="/api/v1")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            f"/api/v1/organizations/{org_id}/members/{target_user_id}",
            json={"role": "admin"},
        )
        assert resp.status_code == 204
        assert mock_publisher.publish.called

        notifications, _, _ = await notification_service.list_notifications(user_id=target_user_id)
        assert len(notifications) == 1
        assert notifications[0].type == NotificationType.ROLE_UPDATED
        assert "admin" in notifications[0].message
