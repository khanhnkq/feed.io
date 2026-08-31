import json
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from feedio.bootstrap.config import Settings
from feedio.modules.collaboration.domain.entities import PresenceUser, RealtimeEvent
from feedio.modules.collaboration.infrastructure.connection_manager import ValkeyConnectionManager
from feedio.modules.collaboration.infrastructure.presence_service import ValkeyPresenceService
from feedio.modules.collaboration.infrastructure.valkey_event_publisher import ValkeyEventPublisher
from feedio.modules.collaboration.presentation.router import create_collaboration_router


def test_realtime_event_to_dict() -> None:
    event = RealtimeEvent(
        event_type="comment.created",
        room="media:123",
        payload={"text": "Hello"},
    )
    data = event.to_dict()
    assert data["event_type"] == "comment.created"
    assert data["room"] == "media:123"
    assert data["payload"]["text"] == "Hello"
    assert "created_at" in data


@pytest.mark.asyncio
async def test_valkey_event_publisher() -> None:
    redis_mock = AsyncMock()
    settings = Settings(valkey_url="redis://localhost:6379/0")
    publisher = ValkeyEventPublisher(settings, redis_client=redis_mock)

    event = RealtimeEvent(
        event_type="comment.created",
        room="media:media-1",
        payload={"comment_id": "c-1"},
    )
    await publisher.publish(event)
    redis_mock.publish.assert_awaited_once()
    args, _ = redis_mock.publish.call_args
    assert args[0] == "feedio:room:media:media-1"
    parsed_json = json.loads(args[1])
    assert parsed_json["event_type"] == "comment.created"


@pytest.mark.asyncio
async def test_valkey_presence_service() -> None:
    redis_mock = AsyncMock()
    user_id = uuid4()
    presence_user = PresenceUser(
        user_id=user_id,
        name="Elena Rostova",
        email="elena@feed.io",
    )

    redis_mock.hgetall.return_value = {
        str(user_id): json.dumps(presence_user.to_dict())
    }

    settings = Settings(valkey_url="redis://localhost:6379/0")
    service = ValkeyPresenceService(settings, redis_client=redis_mock)

    users = await service.join_room("media:media-1", presence_user)
    assert len(users) == 1
    assert users[0].name == "Elena Rostova"
    redis_mock.hset.assert_awaited_once()

    await service.leave_room("media:media-1", user_id)
    redis_mock.hdel.assert_awaited_once()


@pytest.mark.asyncio
async def test_valkey_connection_manager_broadcast() -> None:
    manager = ValkeyConnectionManager(valkey_url="redis://localhost:6379/0")
    ws_mock = AsyncMock()
    user_id = uuid4()

    await manager.connect("media:m1", user_id, ws_mock)
    await manager.broadcast_to_room("media:m1", {"event_type": "test", "data": 123})

    ws_mock.send_text.assert_awaited_once()
    await manager.disconnect("media:m1", user_id, ws_mock)


def test_collaboration_presence_http_endpoint() -> None:
    presence_mock = AsyncMock()
    u_id = uuid4()
    presence_mock.list_presence.return_value = [
        PresenceUser(user_id=u_id, name="Sarah", email="sarah@feed.io")
    ]
    connection_manager_mock = AsyncMock()
    event_publisher_mock = AsyncMock()
    token_manager_mock = MagicMock()

    app = FastAPI()
    router = create_collaboration_router(
        connection_manager=connection_manager_mock,
        event_publisher=event_publisher_mock,
        presence_service=presence_mock,
        token_manager=token_manager_mock,
        auth_repo_provider=AsyncMock(),
    )
    app.include_router(router, prefix="/api/v1")

    client = TestClient(app)
    response = client.get("/api/v1/rooms/media:123/presence")
    assert response.status_code == 200
    data = response.json()
    assert data["room"] == "media:123"
    assert len(data["users"]) == 1
    assert data["users"][0]["name"] == "Sarah"
