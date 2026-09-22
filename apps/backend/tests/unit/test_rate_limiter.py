from typing import Any

import pytest

from feedio.shared.infrastructure.rate_limit import ValkeySlidingWindowRateLimiter


class FakeRedisPipeline:
    def __init__(self, fake_redis: "FakeRedis") -> None:
        self._fake_redis = fake_redis
        self._commands: list[tuple[str, tuple[Any, ...]]] = []

    def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> "FakeRedisPipeline":
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


@pytest.mark.asyncio
async def test_sliding_window_allows_under_limit() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)

    # Allow 3 requests per 60s
    res1 = await limiter.check("user:123", limit=3, window_seconds=60)
    assert res1.allowed is True
    assert res1.remaining == 2
    assert res1.retry_after == 0

    res2 = await limiter.check("user:123", limit=3, window_seconds=60)
    assert res2.allowed is True
    assert res2.remaining == 1
    assert res2.retry_after == 0

    res3 = await limiter.check("user:123", limit=3, window_seconds=60)
    assert res3.allowed is True
    assert res3.remaining == 0
    assert res3.retry_after == 0


@pytest.mark.asyncio
async def test_sliding_window_blocks_over_limit() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)

    # Exhaust 2 tokens
    await limiter.check("user:abc", limit=2, window_seconds=60)
    await limiter.check("user:abc", limit=2, window_seconds=60)

    # 3rd request should be blocked
    blocked = await limiter.check("user:abc", limit=2, window_seconds=60)
    assert blocked.allowed is False
    assert blocked.remaining == 0
    assert blocked.retry_after > 0
    assert blocked.reset_seconds == blocked.retry_after


@pytest.mark.asyncio
async def test_sliding_window_key_isolation() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)

    # User 1 exhausts limit
    await limiter.check("user:1", limit=1, window_seconds=60)
    blocked_u1 = await limiter.check("user:1", limit=1, window_seconds=60)
    assert blocked_u1.allowed is False

    # User 2 should still be allowed
    allowed_u2 = await limiter.check("user:2", limit=1, window_seconds=60)
    assert allowed_u2.allowed is True


@pytest.mark.asyncio
async def test_sliding_window_zero_limit() -> None:
    fake_redis = FakeRedis()
    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=fake_redis)

    res = await limiter.check("user:zero", limit=0, window_seconds=30)
    assert res.allowed is False
    assert res.remaining == 0
    assert res.retry_after == 30


@pytest.mark.asyncio
async def test_sliding_window_fail_open_on_redis_error() -> None:
    class BrokenRedis:
        def pipeline(self, transaction: bool = True) -> Any:
            raise ConnectionError("Valkey cluster connection refused")

    limiter = ValkeySlidingWindowRateLimiter(valkey_url="", redis_client=BrokenRedis())

    # Must not raise exception, must allow request (fail-open)
    res = await limiter.check("user:err", limit=5, window_seconds=60)
    assert res.allowed is True
    assert res.remaining == 5
    assert res.retry_after == 0
