import json
from uuid import UUID

import aio_pika
import structlog

from feedio.bootstrap.config import Settings
from feedio.modules.media.application.ports import MediaJobPublisher

logger = structlog.get_logger()
MEDIA_TRANSCODE_QUEUE = "media.transcode"


class RabbitMQMediaJobPublisher(MediaJobPublisher):
    def __init__(self, settings: Settings) -> None:
        self._rabbitmq_url = settings.rabbitmq_url

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
            connection = await aio_pika.connect_robust(self._rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)
                queue = await channel.declare_queue(
                    MEDIA_TRANSCODE_QUEUE,
                    durable=True,
                )
                message = aio_pika.Message(
                    body=body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                )
                await channel.default_exchange.publish(
                    message,
                    routing_key=queue.name,
                )
                logger.info(
                    "transcode_job_published",
                    media_id=str(media_id),
                    queue=MEDIA_TRANSCODE_QUEUE,
                )
        except Exception as exc:
            logger.error(
                "transcode_job_publish_failed",
                media_id=str(media_id),
                error=str(exc),
            )
            # In development if RabbitMQ is offline, do not block the entire HTTP complete request
