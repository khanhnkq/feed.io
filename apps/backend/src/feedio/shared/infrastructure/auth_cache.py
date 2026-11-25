import contextlib
from typing import Any
from uuid import UUID

import orjson
from redis.asyncio import Redis

from feedio.modules.identity.domain.value_objects import CurrentUser, PlatformRole
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)


class ValkeyAuthContextCache:
    """Short-TTL Valkey cache for CurrentUser and OrganizationContext (fail-open)."""

    def __init__(
        self,
        valkey_url: str,
        ttl_seconds: int = 60,
        redis_client: Redis | None = None,
    ) -> None:
        self._valkey_url = valkey_url
        self._ttl_seconds = max(1, ttl_seconds)
        self._redis = redis_client
        self._owns_client = redis_client is None

    async def _get_client(self) -> Redis | None:
        if self._redis is None:
            if not self._valkey_url:
                return None
            self._redis = Redis.from_url(
                self._valkey_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
            )
        return self._redis

    async def aclose(self) -> None:
        if self._owns_client and self._redis is not None:
            with contextlib.suppress(Exception):
                await self._redis.aclose()
            self._redis = None

    @staticmethod
    def _user_key(user_id: UUID) -> str:
        return f"feedio:auth:user:{user_id}"

    @staticmethod
    def _org_key(organization_id: UUID, user_id: UUID) -> str:
        return f"feedio:auth:org_ctx:{organization_id}:{user_id}"

    async def get_user(
        self,
        user_id: UUID,
        session_id: UUID | None = None,
    ) -> CurrentUser | None:
        try:
            client = await self._get_client()
            if client is None:
                return None
            raw = await client.get(self._user_key(user_id))
            if not raw:
                return None
            data: dict[str, Any] = orjson.loads(raw)
            return CurrentUser(
                id=UUID(str(data["id"])),
                email=str(data["email"]),
                email_verified=bool(data["email_verified"]),
                has_organization=bool(data.get("has_organization", False)),
                platform_role=PlatformRole(str(data.get("platform_role", PlatformRole.USER))),
                session_id=session_id,
                has_password=bool(data.get("has_password", True)),
            )
        except Exception:
            return None

    async def set_user(self, user: CurrentUser) -> None:
        try:
            client = await self._get_client()
            if client is None:
                return
            payload = orjson.dumps(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "email_verified": user.email_verified,
                    "has_organization": user.has_organization,
                    "platform_role": str(user.platform_role),
                    "has_password": user.has_password,
                }
            ).decode("utf-8")
            await client.set(self._user_key(user.id), payload, ex=self._ttl_seconds)
        except Exception:
            pass

    async def invalidate_user(self, user_id: UUID) -> None:
        try:
            client = await self._get_client()
            if client is not None:
                await client.delete(self._user_key(user_id))
        except Exception:
            pass

    async def get_org_context(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> OrganizationContext | None:
        try:
            client = await self._get_client()
            if client is None:
                return None
            raw = await client.get(self._org_key(organization_id, user_id))
            if not raw:
                return None
            data: dict[str, Any] = orjson.loads(raw)
            return OrganizationContext(
                organization_id=UUID(str(data["organization_id"])),
                user_id=UUID(str(data["user_id"])),
                role=OrganizationRole(str(data["role"])),
            )
        except Exception:
            return None

    async def set_org_context(self, context: OrganizationContext) -> None:
        try:
            client = await self._get_client()
            if client is None:
                return
            payload = orjson.dumps(
                {
                    "organization_id": str(context.organization_id),
                    "user_id": str(context.user_id),
                    "role": str(context.role),
                }
            ).decode("utf-8")
            await client.set(
                self._org_key(context.organization_id, context.user_id),
                payload,
                ex=self._ttl_seconds,
            )
        except Exception:
            pass

    async def invalidate_org_context(self, organization_id: UUID, user_id: UUID) -> None:
        try:
            client = await self._get_client()
            if client is not None:
                await client.delete(self._org_key(organization_id, user_id))
        except Exception:
            pass
