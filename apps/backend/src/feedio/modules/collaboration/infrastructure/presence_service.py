import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from redis.asyncio import Redis

from feedio.bootstrap.config import Settings
from feedio.modules.collaboration.application.ports import PresenceService
from feedio.modules.collaboration.domain.entities import PresenceUser


class ValkeyPresenceService(PresenceService):
    def __init__(self, settings: Settings, redis_client: Redis[Any] | None = None) -> None:
        self._settings = settings
        self._redis = redis_client
        self._presence_ttl_seconds = settings.collaboration_presence_ttl_seconds

    async def _get_redis(self) -> Redis[Any]:
        if self._redis is None:
            self._redis = Redis.from_url(
                self._settings.valkey_url,
                decode_responses=True,
            )
        return self._redis

    def _key(self, room: str) -> str:
        return f"feedio:presence:{room}"

    async def join_room(self, room: str, user: PresenceUser) -> list[PresenceUser]:
        client = await self._get_redis()
        key = self._key(room)
        user_json = json.dumps(user.to_dict())
        await client.hset(key, str(user.user_id), user_json)
        await client.expire(key, self._presence_ttl_seconds)
        return await self.list_presence(room)

    async def leave_room(self, room: str, user_id: UUID) -> list[PresenceUser]:
        client = await self._get_redis()
        key = self._key(room)
        await client.hdel(key, str(user_id))
        return await self.list_presence(room)

    async def list_presence(self, room: str) -> list[PresenceUser]:
        client = await self._get_redis()
        key = self._key(room)
        raw_users = await client.hgetall(key)
        users: list[PresenceUser] = []

        for _, user_str in raw_users.items():
            try:
                data = json.loads(user_str)
                users.append(
                    PresenceUser(
                        user_id=UUID(data["user_id"]),
                        name=data.get("name", "Unknown User"),
                        email=data.get("email"),
                        avatar_url=data.get("avatar_url"),
                        joined_at=datetime.fromisoformat(data["joined_at"])
                        if "joined_at" in data
                        else datetime.now(UTC),
                    )
                )
            except (json.JSONDecodeError, KeyError, ValueError):
                continue

        return users
