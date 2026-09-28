import contextlib
from typing import Any


class PlatformBillingSettings:
    """Manages platform-wide billing & payment state (enabled/disabled) with Valkey caching."""

    _memory_override: bool | None = None

    def __init__(
        self,
        valkey_url: str | None = None,
        default_enabled: bool = True,
        provider: str = "mock",
    ) -> None:
        self._valkey_url = valkey_url
        self._default_enabled = default_enabled
        self.provider = provider
        self._client: Any = None

    async def _get_client(self) -> Any:
        if self._client is None and self._valkey_url:
            try:
                import redis.asyncio as aioredis

                self._client = aioredis.from_url(
                    self._valkey_url,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                )
            except Exception:
                self._client = None
        return self._client

    async def is_payments_enabled(self) -> bool:
        client = await self._get_client()
        if client:
            with contextlib.suppress(Exception):
                val = await client.get("platform:payments_enabled")
                if val is not None:
                    return val.lower() in ("true", "1", "yes")

        if self.__class__._memory_override is not None:
            return self.__class__._memory_override

        return self._default_enabled

    async def set_payments_enabled(self, enabled: bool) -> bool:
        self.__class__._memory_override = enabled
        client = await self._get_client()
        if client:
            with contextlib.suppress(Exception):
                await client.set("platform:payments_enabled", "true" if enabled else "false")
        return enabled
