import json
from uuid import UUID

import structlog
from redis.asyncio import Redis

from feedio.bootstrap.config import Settings
from feedio.modules.media.application.ports import MediaJobPublisher
from feedio.modules.media.infrastructure.rabbitmq_job_publisher import (
    RabbitMQMediaJobPublisher,
)

logger = structlog.get_logger()
VALKEY_TRANSCODE_QUEUE_KEY = "feedio:queue:media.transcode"


class ValkeyMediaJobPublisher(MediaJobPublisher):
    """Lightweight Redis/Valkey LIST-backed job publisher (RPUSH + Worker BLPOP)."""

    def __init__(self, settings: Settings, redis_client: Redis | None = None) -> None:
        self._valkey_url = settings.queue_valkey_url or settings.valkey_url
        self._redis = redis_client
        self._owns_client = redis_client is None

    async def _get_client(self) -> Redis:
        if self._redis is None:
            self._redis = Redis.from_url(self._valkey_url, decode_responses=False)
        return self._redis

    async def aclose(self) -> None:
        if self._owns_client and self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def publish_transcode_job(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> None:
        payload = {
            "organization_id": str(organization_id),
            "project_id": str(project_id),
            "media_id": str(media_id),
            "storage_key": storage_key,
            "filename": filename,
            "mime_type": mime_type,
        }
        body = json.dumps(payload).encode("utf-8")

        try:
            client = await self._get_client()
            await client.rpush(VALKEY_TRANSCODE_QUEUE_KEY, body)  # type: ignore[misc]
            logger.info(
                "transcode_job_published",
                media_id=str(media_id),
                queue=VALKEY_TRANSCODE_QUEUE_KEY,
                provider="valkey",
            )
        except Exception as exc:
            logger.error(
                "transcode_job_publish_failed",
                media_id=str(media_id),
                provider="valkey",
                error=str(exc),
            )


def create_media_job_publisher(
    settings: Settings,
    redis_client: Redis | None = None,
) -> MediaJobPublisher:
    """Factory selecting Valkey (default zero-overhead) or RabbitMQ/CloudAMQP."""
    if settings.queue_provider.lower() == "rabbitmq":
        return RabbitMQMediaJobPublisher(settings)
    return ValkeyMediaJobPublisher(settings, redis_client=redis_client)
