import contextlib
from typing import Any
from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.errors import FileTooLargeError, StorageQuotaExceededError


class StorageQuotaService:
    def __init__(
        self,
        repository: MediaRepository,
        valkey_url: str | None = None,
        default_quota_bytes: int = 5 * 1024 * 1024 * 1024,  # 5 GB (Free Tier default)
        max_single_file_bytes: int = 50 * 1024 * 1024 * 1024,  # 50 GB
    ) -> None:
        self._repository = repository
        self._valkey_url = valkey_url
        self._default_quota = default_quota_bytes
        self._max_single_file = max_single_file_bytes
        self._redis_client: Any = None

    async def _get_client(self) -> Any:
        if self._redis_client is None and self._valkey_url:
            try:
                import redis.asyncio as aioredis

                self._redis_client = aioredis.from_url(
                    self._valkey_url,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                )
            except Exception:
                self._redis_client = None
        return self._redis_client

    async def get_storage_quota(self, organization_id: UUID) -> int:
        client = await self._get_client()
        key = f"org:{organization_id}:storage_quota_bytes"
        if client:
            with contextlib.suppress(Exception):
                cached = await client.get(key)
                if cached is not None:
                    return int(cached)

        if hasattr(self._repository, "get_organization_storage_quota_bytes"):
            quota = await self._repository.get_organization_storage_quota_bytes(organization_id)
            if quota is not None:
                if client:
                    with contextlib.suppress(Exception):
                        await client.set(key, str(quota), ex=3600)  # 1 hour TTL
                return quota

        return self._default_quota

    async def get_storage_usage(self, organization_id: UUID) -> int:
        client = await self._get_client()
        key = f"org:{organization_id}:storage_usage_bytes"
        if client:
            with contextlib.suppress(Exception):
                cached = await client.get(key)
                if cached is not None:
                    return int(cached)

        usage = await self._repository.get_organization_storage_usage_bytes(organization_id)
        if client:
            with contextlib.suppress(Exception):
                await client.set(key, str(usage), ex=300)  # 5 min TTL
        return usage

    async def check_upload_allowed(
        self,
        organization_id: UUID,
        file_size_bytes: int,
        quota_bytes: int | None = None,
    ) -> None:
        if file_size_bytes > self._max_single_file:
            limit_mb = self._max_single_file / (1024 * 1024)
            file_mb = file_size_bytes / (1024 * 1024)
            raise FileTooLargeError(
                f"File size ({file_mb:.1f} MB) exceeds maximum allowed file size ({limit_mb:.1f} MB)"
            )

        effective_quota = quota_bytes or await self.get_storage_quota(organization_id)
        current_usage = await self.get_storage_usage(organization_id)
        if current_usage + file_size_bytes > effective_quota:
            used_mb = current_usage / (1024 * 1024)
            file_mb = file_size_bytes / (1024 * 1024)
            quota_mb = effective_quota / (1024 * 1024)
            raise StorageQuotaExceededError(
                f"Storage quota exceeded: current usage ({used_mb:.1f} MB) + file ({file_mb:.1f} MB) "
                f"exceeds organization limit ({quota_mb:.1f} MB)"
            )

    async def record_upload_completed(
        self,
        organization_id: UUID,
        file_size_bytes: int,
    ) -> None:
        client = await self._get_client()
        if client:
            key = f"org:{organization_id}:storage_usage_bytes"
            with contextlib.suppress(Exception):
                await client.incrby(key, file_size_bytes)

    async def record_media_deleted(
        self,
        organization_id: UUID,
        file_size_bytes: int,
    ) -> None:
        client = await self._get_client()
        if client:
            key = f"org:{organization_id}:storage_usage_bytes"
            with contextlib.suppress(Exception):
                await client.delete(key)

    async def invalidate_organization_quota_cache(
        self,
        organization_id: UUID,
    ) -> None:
        client = await self._get_client()
        if client:
            key = f"org:{organization_id}:storage_quota_bytes"
            with contextlib.suppress(Exception):
                await client.delete(key)
