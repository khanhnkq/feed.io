import hashlib
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.modules.comments.domain.entities import MediaComment
from feedio.modules.media.domain.entities import (
    MediaAsset,
    MediaReviewDecision,
    ShareLink,
)
from feedio.modules.media.presentation.public_share_router import (
    create_public_share_router,
)
from feedio.modules.media.presentation.share_links_router import (
    create_share_links_router,
)
from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Project
from tests.unit.test_notifications import InMemoryNotificationRepository


@pytest.mark.asyncio
async def test_create_and_list_and_revoke_share_links():
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    user_id = uuid4()

    mock_media_repo = AsyncMock()
    mock_project_repo = AsyncMock()

    mock_project_repo.get_by_id.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Test Project",
        description="",
        created_at=datetime.now(UTC),
    )

    mock_media_repo.get_by_id.return_value = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=user_id,
        title="Video 1.mp4",
        filename="video1.mp4",
        file_size_bytes=1024,
        mime_type="video/mp4",
        storage_key="keys/video1.mp4",
        status="ready",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    created_link_id = uuid4()

    async def mock_create_share_link(link: ShareLink) -> ShareLink:
        return link

    mock_media_repo.create_share_link.side_effect = mock_create_share_link

    app = FastAPI()
    router = create_share_links_router(
        media_repository_provider=lambda: mock_media_repo,
        project_repository_provider=lambda: mock_project_repo,
        organization_context_provider=lambda: OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        ),
    )
    app.include_router(
        router,
        prefix="/organizations/{organization_id}/projects/{project_id}/media",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # 1. Create Share Link
        resp = await client.post(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links",
            json={
                "passphrase": "secret-passphrase",
                "expires_in_days": 7,
                "allow_comments": True,
                "allow_approval": True,
                "allow_download": False,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "raw_token" in data
        assert data["share_url"].startswith("/share/")
        assert data["has_passphrase"] is True
        assert data["allow_comments"] is True
        assert data["allow_approval"] is True
        assert data["allow_download"] is False

        # 2. List Share Links
        mock_media_repo.list_share_links.return_value = [
            ShareLink(
                id=created_link_id,
                organization_id=org_id,
                project_id=proj_id,
                media_id=media_id,
                folder_id=None,
                created_by_user_id=user_id,
                token_hash="hash123",
                passphrase_hash="passhash123",
                allow_comments=True,
                allow_approval=True,
                allow_download=False,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                access_count=3,
                is_revoked=False,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        ]
        list_resp = await client.get(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links"
        )
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == str(created_link_id)
        assert list_data[0]["access_count"] == 3

        # 3. Revoke Share Link
        mock_media_repo.revoke_share_link.return_value = None
        del_resp = await client.delete(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links/{created_link_id}"
        )
        assert del_resp.status_code == 204
        mock_media_repo.revoke_share_link.assert_awaited_once_with(
            organization_id=org_id,
            project_id=proj_id,
            share_link_id=created_link_id,
        )


@pytest.mark.asyncio
async def test_public_guest_review_flow():
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    creator_id = uuid4()
    raw_token = "secure_random_token_12345"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    passphrase = "guest-password-99"
    passphrase_hash = hashlib.sha256(passphrase.encode()).hexdigest()

    mock_media_repo = AsyncMock()
    mock_storage = AsyncMock()
    mock_comment_repo = AsyncMock()
    mock_publisher = AsyncMock()
    notification_repo = InMemoryNotificationRepository()
    notification_service = NotificationServiceImpl(
        repository=notification_repo,
        event_publisher=mock_publisher,
    )

    share_link = ShareLink(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        folder_id=None,
        created_by_user_id=creator_id,
        token_hash=token_hash,
        passphrase_hash=passphrase_hash,
        allow_comments=True,
        allow_approval=True,
        allow_download=True,
        expires_at=datetime.now(UTC) + timedelta(days=5),
        access_count=0,
        is_revoked=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=creator_id,
        title="Commercial_Master.mp4",
        filename="Commercial_Master.mp4",
        file_size_bytes=5000000,
        mime_type="video/mp4",
        storage_key="org/media/video.mp4",
        thumbnail_storage_key="org/media/thumb.jpg",
        hls_storage_key="org/media/hls/master.m3u8",
        status="ready",
        review_status="pending",
        duration_seconds=30.0,
        fps=24.0,
        width=1920,
        height=1080,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_media_repo.get_share_link_by_token_hash.return_value = share_link
    mock_media_repo.get_by_id.return_value = media
    mock_storage.generate_presigned_view_url.side_effect = lambda key, **kwargs: f"https://cdn.feedio.test/{key}?signed=true"

    mock_media_repo.record_decision.return_value = MediaReviewDecision(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=creator_id,
        status="approved",
        notes="Approved by external client",
        created_at=datetime.now(UTC),
        user_name="Alice Client (Guest)",
    )

    from dataclasses import replace

    async def mock_create_comment(c: MediaComment) -> MediaComment:
        return replace(c, author_name="Alice Client (Guest)")

    mock_comment_repo.create.side_effect = mock_create_comment
    mock_comment_repo.list_by_media.return_value = []

    app = FastAPI()
    router = create_public_share_router(
        media_repository_provider=lambda: mock_media_repo,
        storage_service_provider=lambda: mock_storage,
        comment_repository_provider=lambda: mock_comment_repo,
        event_publisher_provider=lambda: mock_publisher,
        notification_service_provider=lambda: notification_service,
    )
    app.include_router(router, prefix="/api/v1/public/shares")

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # 1. Unauthenticated details query (has_passphrase = true, is_authenticated = false)
        resp = await client.get(f"/api/v1/public/shares/{raw_token}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Commercial_Master.mp4"
        assert data["has_passphrase"] is True
        assert data["is_authenticated"] is False
        assert data["thumbnail_url"] is None

        # 2. Verify passphrase with incorrect password -> 401
        verify_fail = await client.post(
            f"/api/v1/public/shares/{raw_token}/verify",
            json={"passphrase": "wrong-password"},
        )
        assert verify_fail.status_code == 401

        # 3. Verify passphrase with correct password -> 200
        verify_ok = await client.post(
            f"/api/v1/public/shares/{raw_token}/verify",
            json={"passphrase": passphrase},
        )
        assert verify_ok.status_code == 200
        verify_data = verify_ok.json()
        assert verify_data["success"] is True
        guest_token = verify_data["guest_token"]
        assert guest_token is not None

        # 4. Stream endpoint with passphrase header
        stream_resp = await client.get(
            f"/api/v1/public/shares/{raw_token}/stream",
            headers={"X-Share-Passphrase": passphrase},
        )
        assert stream_resp.status_code == 200
        stream_data = stream_resp.json()
        assert "hls_url" in stream_data
        assert "stream_url" in stream_data
        assert stream_data["fps"] == 24.0

        # 5. Guest Comment submission
        comment_resp = await client.post(
            f"/api/v1/public/shares/{raw_token}/comments",
            headers={"X-Share-Passphrase": passphrase},
            json={
                "guest_name": "Alice Client",
                "content": "Check color grading at 00:15",
                "timestamp_seconds": 15.5,
                "frame_number": 372,
                "annotation_data": {"type": "arrow", "points": [100, 200, 300, 400]},
            },
        )
        assert comment_resp.status_code == 201
        comment_data = comment_resp.json()
        assert comment_data["content"] == "Check color grading at 00:15"
        assert comment_data["author"]["name"] == "Alice Client (Guest)"

        # Verify comment realtime broadcast
        published_events = [call.args[0] for call in mock_publisher.publish.await_args_list]
        comment_events = [e for e in published_events if e.event_type == "comment.created"]
        assert len(comment_events) >= 1
        assert comment_events[0].room == f"media:{media_id}"

        # Verify comment notification sent to media creator
        notifications, _ = await notification_repo.list_for_user(creator_id, org_id)
        assert len(notifications) == 1
        assert notifications[0].type == NotificationType.COMMENT_REPLY
        assert "Alice Client (Guest)" in notifications[0].title

        # 6. Guest Decision submission
        decision_resp = await client.post(
            f"/api/v1/public/shares/{raw_token}/decisions",
            headers={"X-Share-Passphrase": passphrase},
            json={
                "guest_name": "Alice Client",
                "status": "approved",
                "notes": "Approved by external client",
            },
        )
        assert decision_resp.status_code == 201
        decision_data = decision_resp.json()
        assert decision_data["status"] == "approved"
        assert decision_data["user_name"] == "Alice Client (Guest)"

        # Verify decision updated media review status
        mock_media_repo.update_review_status.assert_awaited_once_with(
            organization_id=org_id,
            project_id=proj_id,
            media_id=media_id,
            status="approved",
            reviewed_by_user_id=None,
        )

        # Verify decision realtime broadcast
        published_events = [call.args[0] for call in mock_publisher.publish.await_args_list]
        decision_events = [e for e in published_events if e.event_type == "decision.updated"]
        assert len(decision_events) >= 2
        decision_rooms = {e.room for e in decision_events}
        assert f"media:{media_id}" in decision_rooms
        assert f"project:{proj_id}" in decision_rooms

        # 7. Download link
        download_resp = await client.get(
            f"/api/v1/public/shares/{raw_token}/download",
            headers={"X-Share-Passphrase": passphrase},
        )
        assert download_resp.status_code == 200
        download_data = download_resp.json()
        assert "download_url" in download_data
        assert download_data["filename"] == "Commercial_Master.mp4"


@pytest.mark.asyncio
async def test_create_share_link_requires_expiration():
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    user_id = uuid4()

    mock_media_repo = AsyncMock()
    mock_project_repo = AsyncMock()

    app = FastAPI()
    router = create_share_links_router(
        media_repository_provider=lambda: mock_media_repo,
        project_repository_provider=lambda: mock_project_repo,
        organization_context_provider=lambda: OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        ),
    )
    app.include_router(
        router,
        prefix="/organizations/{organization_id}/projects/{project_id}/media",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # Invalid 0 days (must be ge=1)
        resp_zero = await client.post(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links",
            json={"expires_in_days": 0},
        )
        assert resp_zero.status_code == 422

        # Invalid negative days
        resp_neg = await client.post(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links",
            json={"expires_in_days": -5},
        )
        assert resp_neg.status_code == 422

        # Invalid None / null
        resp_null = await client.post(
            f"/organizations/{org_id}/projects/{proj_id}/media/{media_id}/share-links",
            json={"expires_in_days": None},
        )
        assert resp_null.status_code == 422

