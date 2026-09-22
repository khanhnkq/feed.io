from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import jwt
from fastapi import FastAPI
from fastapi.testclient import TestClient

from feedio.bootstrap.config import Settings
from feedio.shared.infrastructure.rate_limit import ValkeySlidingWindowRateLimiter
from feedio.shared.presentation.rate_limit import RateLimitMiddleware


class FakeRedisPipeline:
    def __init__(self, fake_redis: "FakeRedis") -> None:
        self._fake_redis = fake_redis
        self._commands: list[tuple[str, tuple[Any, ...]]] = []

    def zremrangebyscore(
        self, key: str, min_score: float, max_score: float
    ) -> "FakeRedisPipeline":
        self._commands.append(("zremrangebyscore", (key, min_score, max_score)))
        return self

    def zcard(self, key: str) -> "FakeRedisPipeline":
        self._commands.append(("zcard", (key,)))
        return self

    def zrange(
        self, key: str, start: int, stop: int, withscores: bool = False
    ) -> "FakeRedisPipeline":
        self._commands.append(("zrange", (key, start, stop, withscores)))
        return self

    def zadd(self, key: str, mapping: dict[str, float]) -> "FakeRedisPipeline":
        self._commands.append(("zadd", (key, mapping)))
        return self

    def expire(self, key: str, seconds: int) -> "FakeRedisPipeline":
        self._commands.append(("expire", (key, seconds)))
        return self

    async def execute(self) -> list[Any]:
        results: list[Any] = []
        for cmd, args in self._commands:
            if cmd == "zremrangebyscore":
                key, min_s, max_s = args
                zset = self._fake_redis.data.get(key, {})
                to_del = [m for m, s in zset.items() if min_s <= s <= max_s]
                for m in to_del:
                    del zset[m]
                results.append(len(to_del))
            elif cmd == "zcard":
                key = args[0]
                results.append(len(self._fake_redis.data.get(key, {})))
            elif cmd == "zrange":
                key, start, stop, withscores = args
                zset = self._fake_redis.data.get(key, {})
                sorted_items = sorted(zset.items(), key=lambda x: x[1])
                sliced = sorted_items[start : stop + 1 if stop != -1 else None]
                if withscores:
                    results.append([(m, s) for m, s in sliced])
                else:
                    results.append([m for m, _ in sliced])
            elif cmd == "zadd":
                key, mapping = args
                if key not in self._fake_redis.data:
                    self._fake_redis.data[key] = {}
                self._fake_redis.data[key].update(mapping)
                results.append(len(mapping))
            elif cmd == "expire":
                results.append(True)
        self._commands.clear()
        return results

    async def __aenter__(self) -> "FakeRedisPipeline":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class FakeRedis:
    def __init__(self) -> None:
        self.data: dict[str, dict[str, float]] = {}

    def pipeline(self, transaction: bool = True) -> FakeRedisPipeline:
        return FakeRedisPipeline(self)

    async def aclose(self) -> None:
        pass


def create_test_app(
    limiter: ValkeySlidingWindowRateLimiter, settings: Settings
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        RateLimitMiddleware,
        limiter=limiter,
        settings=settings,
    )

    @app.get("/api/v1/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/v1/auth/login")
    async def login() -> dict[str, str]:
        return {"status": "logged_in"}

    @app.get("/api/v1/projects")
    async def list_projects() -> list[str]:
        return ["project-1"]

    @app.post("/api/v1/media/upload")
    async def upload_media() -> dict[str, str]:
        return {"status": "uploaded"}

    return app


def test_rate_limit_middleware_attaches_ietf_headers() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)
    settings = Settings(
        environment="production",
        rate_limit_enabled=True,
        rate_limit_general_rpm=10,
        auth_jwt_secret="a" * 64,
        auth_cookie_secure=True,
    )
    app = create_test_app(limiter, settings)
    client = TestClient(app)

    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    assert "RateLimit-Limit" in res.headers
    assert res.headers["RateLimit-Limit"] == "10"
    assert res.headers["RateLimit-Remaining"] == "9"
    assert int(res.headers["RateLimit-Reset"]) > 0


def test_rate_limit_middleware_exempt_path() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)
    settings = Settings(
        environment="production",
        rate_limit_enabled=True,
        rate_limit_general_rpm=1,
        auth_jwt_secret="a" * 64,
        auth_cookie_secure=True,
    )
    app = create_test_app(limiter, settings)
    client = TestClient(app)

    res = client.get("/api/v1/health/live")
    assert res.status_code == 200
    assert "RateLimit-Limit" not in res.headers


def test_rate_limit_middleware_exceeded_returns_429_and_retry_after() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)
    settings = Settings(
        environment="production",
        rate_limit_enabled=True,
        rate_limit_auth_rpm=2,
        auth_jwt_secret="a" * 64,
        auth_cookie_secure=True,
    )
    app = create_test_app(limiter, settings)
    client = TestClient(app)

    # 1st request
    res1 = client.post("/api/v1/auth/login")
    assert res1.status_code == 200
    assert res1.headers["RateLimit-Remaining"] == "1"

    # 2nd request
    res2 = client.post("/api/v1/auth/login")
    assert res2.status_code == 200
    assert res2.headers["RateLimit-Remaining"] == "0"

    # 3rd request -> Blocked with 429!
    res3 = client.post("/api/v1/auth/login")
    assert res3.status_code == 429
    assert res3.headers["RateLimit-Remaining"] == "0"
    assert "Retry-After" in res3.headers
    assert int(res3.headers["Retry-After"]) > 0

    body = res3.json()
    assert body["status"] == 429
    assert body["code"] == "RATE_LIMIT_EXCEEDED"
    assert "retry_after" in body


def test_rate_limit_middleware_user_identity_from_jwt() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)
    settings = Settings(
        environment="production",
        rate_limit_enabled=True,
        rate_limit_upload_rpm=1,
        auth_jwt_secret="a" * 64,
        auth_cookie_secure=True,
    )
    app = create_test_app(limiter, settings)
    client = TestClient(app)

    token_u1 = jwt.encode({"sub": "user-uuid-1"}, "test-secret", algorithm="HS256")
    token_u2 = jwt.encode({"sub": "user-uuid-2"}, "test-secret", algorithm="HS256")

    # User 1 uses token
    res1 = client.post(
        "/api/v1/media/upload", headers={"Authorization": f"Bearer {token_u1}"}
    )
    assert res1.status_code == 200

    # User 1 blocked on 2nd upload
    res1_blocked = client.post(
        "/api/v1/media/upload", headers={"Authorization": f"Bearer {token_u1}"}
    )
    assert res1_blocked.status_code == 429

    # User 2 (same IP) should NOT be blocked because user_id is different
    res2 = client.post(
        "/api/v1/media/upload", headers={"Authorization": f"Bearer {token_u2}"}
    )
    assert res2.status_code == 200
