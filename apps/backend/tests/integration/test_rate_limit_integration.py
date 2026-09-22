import os
from uuid import uuid4

import pytest
from redis.asyncio import Redis

from feedio.shared.infrastructure.rate_limit import ValkeySlidingWindowRateLimiter

VALKEY_URL = os.getenv("FEEDIO_VALKEY_URL", "redis://localhost:6379/0")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_live_valkey_sliding_window_rate_limiter() -> None:
    # Verify connection to live Valkey
    redis_client = Redis.from_url(VALKEY_URL, decode_responses=True)
    try:
        await redis_client.ping()
    except Exception as exc:
        pytest.skip(f"Live Valkey is not reachable at {VALKEY_URL}: {exc}")

    limiter = ValkeySlidingWindowRateLimiter(valkey_url=VALKEY_URL, redis_client=redis_client)
    test_key = f"integration-test-{uuid4()}"

    try:
        # 1. First 3 requests with limit=3 should be allowed
        res1 = await limiter.check(key=test_key, limit=3, window_seconds=10)
        assert res1.allowed is True
        assert res1.remaining == 2
        assert res1.retry_after == 0
        assert res1.reset_seconds > 0

        res2 = await limiter.check(key=test_key, limit=3, window_seconds=10)
        assert res2.allowed is True
        assert res2.remaining == 1
        assert res2.retry_after == 0

        res3 = await limiter.check(key=test_key, limit=3, window_seconds=10)
        assert res3.allowed is True
        assert res3.remaining == 0
        assert res3.retry_after == 0

        # 2. 4th request must be rejected
        res4 = await limiter.check(key=test_key, limit=3, window_seconds=10)
        assert res4.allowed is False
        assert res4.remaining == 0
        assert res4.retry_after > 0
        assert res4.reset_seconds == res4.retry_after

        # 3. Check key exists and has TTL in Valkey
        redis_key = f"feedio:ratelimit:{test_key}"
        ttl = await redis_client.ttl(redis_key)
        assert ttl > 0
        card = await redis_client.zcard(redis_key)
        assert card == 3

    finally:
        # Cleanup
        await redis_client.delete(f"feedio:ratelimit:{test_key}")
        await redis_client.aclose()
