import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.testclient import TestClient

from feedio.bootstrap.config import Settings
from feedio.entrypoints.api import create_app
from feedio.modules.collaboration.infrastructure.connection_manager import ValkeyConnectionManager
from feedio.modules.identity.domain.value_objects import CurrentUser, PlatformRole
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.shared.infrastructure.auth_cache import ValkeyAuthContextCache
from feedio.shared.infrastructure.rate_limit import ValkeySlidingWindowRateLimiter
from feedio.shared.presentation.metrics import MetricsMiddleware
from feedio.shared.presentation.rate_limit import RateLimitMiddleware


class _FakeKvRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.store[key] = value
        return True

    async def delete(self, key: str) -> int:
        return 1 if self.store.pop(key, None) is not None else 0


@pytest.mark.asyncio
async def test_auth_context_cache_user_and_org_roundtrip_and_invalidation() -> None:
    fake_redis = _FakeKvRedis()
    cache = ValkeyAuthContextCache(
        "redis://localhost:6379/0",
        ttl_seconds=60,
        redis_client=fake_redis,  # type: ignore[arg-type]
    )

    uid = uuid4()
    sid1 = uuid4()
    sid2 = uuid4()
    user = CurrentUser(
        id=uid,
        email="demo@feedi.app",
        email_verified=True,
        has_organization=True,
        platform_role=PlatformRole.SUPER_ADMIN,
        session_id=sid1,
        has_password=True,
    )
    assert await cache.get_user(uid, session_id=sid1) is None
    await cache.set_user(user)

    hit = await cache.get_user(uid, session_id=sid2)
    assert hit is not None
    assert hit.id == uid
    assert hit.email == "demo@feedi.app"
    assert hit.session_id == sid2
    assert hit.has_organization is True

    await cache.invalidate_user(uid)
    assert await cache.get_user(uid, session_id=sid2) is None

    org_id = uuid4()
    ctx = OrganizationContext(organization_id=org_id, user_id=uid, role=OrganizationRole.OWNER)
    assert await cache.get_org_context(org_id, uid) is None
    await cache.set_org_context(ctx)

    ctx_hit = await cache.get_org_context(org_id, uid)
    assert ctx_hit == ctx

    await cache.invalidate_org_context(org_id, uid)
    assert await cache.get_org_context(org_id, uid) is None


@pytest.mark.asyncio
async def test_auth_context_cache_fails_open_on_redis_errors() -> None:
    broken = MagicMock()
    broken.get = AsyncMock(side_effect=ConnectionError("valkey down"))
    broken.set = AsyncMock(side_effect=ConnectionError("valkey down"))
    broken.delete = AsyncMock(side_effect=ConnectionError("valkey down"))

    cache = ValkeyAuthContextCache("redis://localhost:6379/0", redis_client=broken)
    uid = uuid4()
    org_id = uuid4()

    assert await cache.get_user(uid) is None
    await cache.set_user(CurrentUser(id=uid, email="a@b.com", email_verified=True))
    await cache.invalidate_user(uid)
    assert await cache.get_org_context(org_id, uid) is None
    await cache.set_org_context(
        OrganizationContext(organization_id=org_id, user_id=uid, role=OrganizationRole.MEMBER)
    )
    await cache.invalidate_org_context(org_id, uid)


def test_rate_limit_middleware_exempts_media_view_and_preview_streams() -> None:
    limiter = MagicMock(spec=ValkeySlidingWindowRateLimiter)
    limiter.check = AsyncMock()
    settings = Settings(
        environment="production",
        rate_limit_enabled=True,
        rate_limit_general_rpm=1,
        auth_jwt_secret="a" * 64,
        auth_cookie_secure=True,
    )

    app = FastAPI()
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RateLimitMiddleware, limiter=limiter, settings=settings)

    @app.get("/api/v1/storage/view/{file_id}")
    async def view_media(file_id: str) -> dict[str, str]:
        return {"file_id": file_id}

    @app.get("/api/v1/storage/preview/{file_id}")
    async def preview_media(file_id: str) -> dict[str, str]:
        return {"preview_id": file_id}

    client = TestClient(app)
    for _ in range(5):
        r1 = client.get("/api/v1/storage/view/pr_abc123")
        r2 = client.get("/api/v1/storage/preview/th_abc123")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert "RateLimit-Limit" not in r1.headers
        assert "RateLimit-Limit" not in r2.headers

    limiter.check.assert_not_awaited()


@pytest.mark.asyncio
async def test_valkey_connection_manager_pubsub_reconnects_after_failure() -> None:
    manager = ValkeyConnectionManager(valkey_url="redis://localhost:6379/0")
    ws_mock = AsyncMock()
    user_id = uuid4()
    await manager.connect("media:demo", user_id, ws_mock)

    attempt = 0

    class _FakePubSub:
        def __init__(self, fail_first: bool) -> None:
            self._fail_first = fail_first

        async def psubscribe(self, pattern: str) -> None:
            if self._fail_first:
                raise ConnectionError("transient disconnect")

        async def listen(self):  # type: ignore[no-untyped-def]
            yield {
                "type": "pmessage",
                "channel": "feedio:room:media:demo",
                "data": json.dumps({"event_type": "comment.created", "id": "c-1"}),
            }
            manager._running = False

        async def punsubscribe(self, pattern: str) -> None:
            pass

        async def aclose(self) -> None:
            pass

    def _fake_from_url(*_args: Any, **_kwargs: Any) -> MagicMock:
        nonlocal attempt
        attempt += 1
        client = MagicMock()
        client.pubsub.return_value = _FakePubSub(fail_first=(attempt == 1))
        client.aclose = AsyncMock()
        return client

    manager._running = True
    with (
        patch(
            "feedio.modules.collaboration.infrastructure.connection_manager.Redis.from_url",
            side_effect=_fake_from_url,
        ),
        patch(
            "feedio.modules.collaboration.infrastructure.connection_manager.asyncio.sleep",
            new_callable=AsyncMock,
        ) as mock_sleep,
    ):
        await asyncio.wait_for(manager._listen_pubsub(), timeout=2.0)

    assert attempt == 2
    mock_sleep.assert_awaited_once()
    ws_mock.send_text.assert_awaited_once()
    sent = json.loads(ws_mock.send_text.call_args.args[0])
    assert sent["event_type"] == "comment.created"


def test_app_uses_orjson_and_settings_read_db_pool_env() -> None:
    app = create_app()
    assert app.router.default_response_class is ORJSONResponse

    settings = Settings(
        environment="development",
        db_pool_size=2,
        db_max_overflow=3,
        auth_cache_ttl_seconds=45,
    )
    assert settings.db_pool_size == 2
    assert settings.db_max_overflow == 3
    assert settings.auth_cache_ttl_seconds == 45
