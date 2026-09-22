import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import structlog
from redis.asyncio import Redis

logger = structlog.get_logger(__name__)


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    """Result of a rate limit check."""

    allowed: bool
    limit: int
    remaining: int
    reset_seconds: int
    retry_after: int


class ValkeySlidingWindowRateLimiter:
    """Distributed Sliding Window Counter Rate Limiter backed by Valkey / Redis."""

    def __init__(self, valkey_url: str, redis_client: Redis[Any] | None = None) -> None:
        self._valkey_url = valkey_url
        self._redis = redis_client
        self._owns_client = redis_client is None

    async def _get_client(self) -> Redis[Any]:
        if self._redis is None:
            self._redis = Redis.from_url(self._valkey_url, decode_responses=True)
        return self._redis

    async def aclose(self) -> None:
        """Gracefully close the redis connection if owned."""
        if self._owns_client and self._redis is not None:
            if hasattr(self._redis, "aclose"):
                await self._redis.aclose()
            elif hasattr(self._redis, "close"):
                await self._redis.close()
            self._redis = None

    async def check(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60,
    ) -> RateLimitResult:
        """Check if request for `key` is allowed within `window_seconds`.

        Uses an atomic sliding-window algorithm backed by Valkey Sorted Sets.
        If Valkey is unavailable, falls back gracefully (fail-open) to prevent outage.
        """
        if limit <= 0:
            return RateLimitResult(
                allowed=False,
                limit=limit,
                remaining=0,
                reset_seconds=window_seconds,
                retry_after=window_seconds,
            )

        now = time.time()
        redis_key = f"feedio:ratelimit:{key}"
        window_start = now - window_seconds

        try:
            client = await self._get_client()
            async with client.pipeline(transaction=True) as pipe:
                # 1. Remove timestamps older than the sliding window
                pipe.zremrangebyscore(redis_key, 0, window_start)
                # 2. Count remaining timestamps in current window
                pipe.zcard(redis_key)
                # 3. Get the oldest element in current window (to compute reset time)
                pipe.zrange(redis_key, 0, 0, withscores=True)
                results = await pipe.execute()

            current_count: int = results[1]
            oldest_entries: list[Any] = results[2]

            if current_count < limit:
                # Under limit -> record this request
                member = f"{now}:{uuid4().hex[:8]}"
                async with client.pipeline(transaction=True) as pipe:
                    pipe.zadd(redis_key, {member: now})
                    pipe.expire(redis_key, window_seconds + 1)
                    await pipe.execute()

                remaining = max(0, limit - (current_count + 1))
                oldest_score = float(oldest_entries[0][1]) if oldest_entries else now
                reset_seconds = max(1, int(window_seconds - (now - oldest_score)))
                return RateLimitResult(
                    allowed=True,
                    limit=limit,
                    remaining=remaining,
                    reset_seconds=reset_seconds,
                    retry_after=0,
                )
            else:
                # Over limit -> reject
                oldest_score = float(oldest_entries[0][1]) if oldest_entries else window_start
                retry_after = max(1, int(window_seconds - (now - oldest_score)))
                return RateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    reset_seconds=retry_after,
                    retry_after=retry_after,
                )

        except Exception as exc:
            # Fail-open resilience: log warning and allow request
            logger.warning(
                "valkey_rate_limiter_unavailable",
                error=str(exc),
                key=key,
                limit=limit,
            )
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=limit,
                reset_seconds=window_seconds,
                retry_after=0,
            )
