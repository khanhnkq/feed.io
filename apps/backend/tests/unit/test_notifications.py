from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.notifications.application.ports import (
    NotificationRepository,
    NotificationService,
)
from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.domain.entities import Notification
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.notifications.presentation.router import create_notifications_router


class InMemoryNotificationRepository(NotificationRepository):
    def __init__(self) -> None:
        self.notifications: dict[str, Notification] = {}

    async def save(self, notification: Notification) -> Notification:
        self.notifications[str(notification.id)] = notification
        return notification

    async def get_by_id(self, notification_id: Any) -> Notification | None:
        return self.notifications.get(str(notification_id))

    async def list_for_user(
        self,
        user_id: Any,
        organization_id: Any = None,
        unread_only: bool = False,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Notification], str | None]:
        results = [
            n for n in self.notifications.values()
            if n.user_id == user_id
            and (organization_id is None or n.organization_id == organization_id)
            and (not unread_only or n.read_at is None)
        ]
        results.sort(key=lambda n: n.created_at, reverse=True)
        return results[:limit], None

    async def count_unread(self, user_id: Any, organization_id: Any = None) -> int:
        return sum(
            1 for n in self.notifications.values()
            if n.user_id == user_id
            and (organization_id is None or n.organization_id == organization_id)
            and n.read_at is None
        )

    async def mark_as_read(self, notification_id: Any, user_id: Any) -> Notification | None:
        n = self.notifications.get(str(notification_id))
        if n and n.user_id == user_id:
            n.read_at = datetime.now(UTC)
            return n
        return None

    async def mark_all_as_read(self, user_id: Any, organization_id: Any = None) -> int:
        count = 0
        now = datetime.now(UTC)
        for n in self.notifications.values():
            if n.user_id == user_id and (organization_id is None or n.organization_id == organization_id):
                if n.read_at is None:
                    n.read_at = now
                    count += 1
        return count


@pytest.mark.asyncio
async def test_notification_entity_creation():
    user_id = uuid4()
    org_id = uuid4()
    n = Notification.create(
        user_id=user_id,
        organization_id=org_id,
        type=NotificationType.MENTION,
        title="Elena mentioned you",
        message="Please review frame 42",
        link_url="/app/org/proj/media/1?t=1.5",
    )
    assert n.user_id == user_id
    assert n.type == NotificationType.MENTION
    assert not n.is_read
    assert n.read_at is None


@pytest.mark.asyncio
async def test_notification_service_creates_and_publishes():
    repo = InMemoryNotificationRepository()
    mock_publisher = AsyncMock()
    service = NotificationServiceImpl(repository=repo, event_publisher=mock_publisher)

    user_id = uuid4()
    org_id = uuid4()
    n = await service.create_notification(
        user_id=user_id,
        organization_id=org_id,
        type=NotificationType.COMMENT_REPLY,
        title="Marcus replied",
        message="Looks solid!",
        link_url="/app/org/proj/media/1?commentId=abc",
    )

    assert n.title == "Marcus replied"
    assert mock_publisher.publish.called
    published_event: RealtimeEvent = mock_publisher.publish.call_args[0][0]
    assert published_event.event_type == "notification.created"
    assert published_event.room == f"user:{user_id}"
    assert published_event.payload["unread_count"] == 1


@pytest.mark.asyncio
async def test_notifications_api_endpoints():
    repo = InMemoryNotificationRepository()
    service = NotificationServiceImpl(repository=repo)
    user_id = uuid4()
    org_id = uuid4()

    # Pre-populate a notification
    n1 = await service.create_notification(
        user_id=user_id,
        organization_id=org_id,
        type=NotificationType.MENTION,
        title="Mention 1",
        message="Check this out",
        link_url="/app/link1",
    )

    app = FastAPI()
    router = create_notifications_router(
        notification_service_provider=lambda: service,
        current_user_provider=lambda: CurrentUser(
            id=user_id,
            email="test@feedio.local",
            display_name="Test User",
            email_verified=True,
        ),
    )
    app.include_router(router, prefix="/api/v1")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List notifications
        res = await client.get("/api/v1/notifications")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 1
        assert data["total_unread"] == 1
        assert data["items"][0]["title"] == "Mention 1"

        # 2. Get unread count
        res_count = await client.get("/api/v1/notifications/unread-count")
        assert res_count.status_code == 200
        assert res_count.json()["unread_count"] == 1

        # 3. Mark single as read
        res_read = await client.patch(f"/api/v1/notifications/{n1.id}/read")
        assert res_read.status_code == 200
        assert res_read.json()["is_read"] is True

        # 4. Verify unread count becomes 0
        res_count2 = await client.get("/api/v1/notifications/unread-count")
        assert res_count2.json()["unread_count"] == 0

        # 5. Add another notification and mark-all-read
        await service.create_notification(
            user_id=user_id,
            organization_id=org_id,
            type=NotificationType.SYSTEM,
            title="System Alert",
            message="Maintenance tonight",
            link_url="/app/alerts",
        )
        res_all = await client.post("/api/v1/notifications/mark-all-read")
        assert res_all.status_code == 200
        assert res_all.json()["unread_count"] == 1


@pytest.mark.asyncio
async def test_comment_mention_dispatches_notification():
    from feedio.modules.comments.presentation.router import create_comments_router
    from feedio.modules.comments.domain.entities import MediaComment
    from feedio.modules.organizations.domain.entities import OrganizationMember
    from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole
    from feedio.modules.projects.domain.entities import Project
    from feedio.shared.domain.pagination import Page

    author_id = uuid4()
    mentioned_id = uuid4()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    notification_repo = InMemoryNotificationRepository()
    mock_publisher = AsyncMock()
    notification_service = NotificationServiceImpl(repository=notification_repo, event_publisher=mock_publisher)

    mock_comment_repo = AsyncMock()
    mock_comment_repo.create.return_value = MediaComment(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=author_id,
        content="Hey @Marcus Vance please check this frame",
        parent_comment_id=None,
        timestamp_seconds=1.5,
        frame_number=36,
        annotation_data=None,
        status="open",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        author_name="Alice Cooper",
        author_email="alice@feed.io",
    )

    mock_project_repo = AsyncMock()
    mock_project_repo.get_by_id.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Film Commercial",
        description="",
        created_at=datetime.now(UTC),
    )

    mock_media_repo = AsyncMock()
    mock_media_repo.get_by_id.return_value = AsyncMock()

    mock_org_repo = AsyncMock()
    mock_org_repo.list_members.return_value = Page(
        items=[
            OrganizationMember(
                organization_id=org_id,
                user_id=mentioned_id,
                email="marcus@feed.io",
                display_name="Marcus Vance",
                organization_role=OrganizationRole.MEMBER,
                status="active",
                joined_at=datetime.now(UTC),
            )
        ],
        has_more=False,
    )

    app = FastAPI()
    router = create_comments_router(
        comment_repository_provider=lambda: mock_comment_repo,
        media_repository_provider=lambda: mock_media_repo,
        project_repository_provider=lambda: mock_project_repo,
        organization_context_provider=lambda: OrganizationContext(
            organization_id=org_id,
            user_id=author_id,
            role=OrganizationRole.OWNER,
        ),
        event_publisher_provider=lambda: mock_publisher,
        notification_service_provider=lambda: notification_service,
        organization_repository_provider=lambda: mock_org_repo,
    )
    app.include_router(router, prefix="/api/v1")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/media/{media_id}/comments",
            json={
                "content": "Hey @Marcus Vance please check this frame",
                "timestamp_seconds": 1.5,
                "frame_number": 36,
            },
        )
        assert res.status_code == 200

    # Verify notification created for mentioned user
    unread_count = await notification_service.get_unread_count(mentioned_id)
    assert unread_count == 1
    items, _, _ = await notification_service.list_notifications(mentioned_id)
    assert len(items) == 1
    assert items[0].type == NotificationType.MENTION
    assert "Alice Cooper mentioned you" in items[0].title

