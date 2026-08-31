import json
from typing import Any

from redis.asyncio import Redis

from feedio.bootstrap.config import Settings
from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent


class ValkeyEventPublisher(RealtimeEventPublisher):
    def __init__(self, settings: Settings, redis_client: Redis[Any] | None = None) -> None:
        self._settings = settings
        self._redis = redis_client

    async def _get_redis(self) -> Redis[Any]:
        if self._redis is None:
            self._redis = Redis.from_url(
                self._settings.valkey_url,
                decode_responses=True,
            )
        return self._redis

    async def publish(self, event: RealtimeEvent) -> None:
        client = await self._get_redis()
        channel = f"feedio:room:{event.room}"
        payload_str = json.dumps(event.to_dict())
        await client.publish(channel, payload_str)
