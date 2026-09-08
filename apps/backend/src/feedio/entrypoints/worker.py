import asyncio
import json
import signal
import time
from uuid import UUID

import aio_pika
import structlog
from prometheus_client import Counter, Gauge, Histogram, start_http_server

import feedio.modules.identity.infrastructure.models  # noqa: F401
import feedio.modules.media.infrastructure.models  # noqa: F401
import feedio.modules.organizations.infrastructure.models  # noqa: F401
import feedio.modules.projects.infrastructure.models  # noqa: F401
from feedio.bootstrap.config import Settings, get_settings
from feedio.bootstrap.database import engine, session_factory
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.collaboration.infrastructure.valkey_event_publisher import ValkeyEventPublisher
from feedio.modules.media.application.commands.process_media_transcode import ProcessMediaTranscode
from feedio.modules.media.infrastructure.rabbitmq_job_publisher import MEDIA_TRANSCODE_QUEUE
from feedio.modules.media.infrastructure.repository import SqlMediaRepository
from feedio.modules.media.infrastructure.storage import S3StorageService
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder
from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.notifications.infrastructure.repository import SqlAlchemyNotificationRepository
from feedio.shared.infrastructure.dependency_checker import InfrastructureDependencyChecker

WORKER_READY = Gauge("feedio_worker_ready", "Whether the infrastructure worker is ready.")
TRANSCODE_TOTAL = Counter(
    "feedio_media_transcode_total",
    "Total media transcode jobs processed",
    ["status"],
)
TRANSCODE_DURATION = Histogram(
    "feedio_media_transcode_duration_seconds",
    "Duration of media transcode jobs in seconds",
)
logger = structlog.get_logger()


async def process_message(
    message: aio_pika.abc.AbstractIncomingMessage,
    settings: Settings,
) -> None:
    async with message.process(requeue=False):
        start_time = time.monotonic()
        try:
            payload = json.loads(message.body.decode("utf-8"))
            org_id = UUID(payload["organization_id"])
            proj_id = UUID(payload["project_id"])
            media_id = UUID(payload["media_id"])
            storage_key = payload["storage_key"]
            filename = payload["filename"]
            mime_type = payload.get("mime_type", "video/mp4")

            logger.info("transcode_job_received", media_id=str(media_id), filename=filename)

            async with session_factory() as session:
                repository = SqlMediaRepository(session)
                storage = S3StorageService(settings)
                transcoder = FFmpegTranscoder(storage)

                valkey_client = None
                if settings.valkey_url:
                    try:
                        import redis.asyncio as aioredis

                        valkey_client = aioredis.from_url(
                            settings.valkey_url,
                            decode_responses=True,
                        )
                    except Exception as valkey_err:
                        logger.warn("valkey_connect_warning", error=str(valkey_err))

                command = ProcessMediaTranscode(
                    repository=repository,
                    transcoder=transcoder,
                    valkey_client=valkey_client,
                )
                media = await command.execute(
                    organization_id=org_id,
                    project_id=proj_id,
                    media_id=media_id,
                    storage_key=storage_key,
                    filename=filename,
                    mime_type=mime_type,
                )

                if valkey_client:
                    await valkey_client.aclose()

                # Broadcast Realtime Event & In-App Notification
                event_publisher = ValkeyEventPublisher(settings)
                notification_service = NotificationServiceImpl(
                    repository=SqlAlchemyNotificationRepository(session),
                    event_publisher=event_publisher,
                )

                if media.status == "ready":
                    TRANSCODE_TOTAL.labels(status="success").inc()
                    transcode_payload = {
                        "media_id": str(media_id),
                        "project_id": str(proj_id),
                        "status": "ready",
                        "duration_seconds": media.duration_seconds,
                        "fps": media.fps,
                    }
                    await event_publisher.publish(
                        RealtimeEvent(
                            event_type="media.transcoded",
                            room=f"project:{proj_id}",
                            payload=transcode_payload,
                        )
                    )
                    await event_publisher.publish(
                        RealtimeEvent(
                            event_type="media.transcoded",
                            room=f"media:{media_id}",
                            payload=transcode_payload,
                        )
                    )
                    if media.created_by_user_id:
                        await notification_service.create_notification(
                            user_id=media.created_by_user_id,
                            organization_id=org_id,
                            type=NotificationType.MEDIA_READY,
                            title="Video processing complete",
                            message=f'"{media.title}" is ready for review.',
                            link_url=f"/app/organizations/{org_id}/projects/{proj_id}/media/{media_id}",
                            metadata_json={"media_id": str(media_id), "project_id": str(proj_id)},
                        )
                else:
                    TRANSCODE_TOTAL.labels(status="failed").inc()
                    failed_payload = {
                        "media_id": str(media_id),
                        "project_id": str(proj_id),
                        "status": "failed",
                        "error": media.error_message,
                    }
                    await event_publisher.publish(
                        RealtimeEvent(
                            event_type="media.transcode_failed",
                            room=f"project:{proj_id}",
                            payload=failed_payload,
                        )
                    )
                    await event_publisher.publish(
                        RealtimeEvent(
                            event_type="media.transcode_failed",
                            room=f"media:{media_id}",
                            payload=failed_payload,
                        )
                    )
                    if media.created_by_user_id:
                        await notification_service.create_notification(
                            user_id=media.created_by_user_id,
                            organization_id=org_id,
                            type=NotificationType.MEDIA_FAILED,
                            title="Video processing failed",
                            message=f'Failed to process "{media.title}".',
                            link_url=f"/app/organizations/{org_id}/projects/{proj_id}/media/{media_id}",
                            metadata_json={"media_id": str(media_id), "project_id": str(proj_id)},
                        )

            elapsed = time.monotonic() - start_time
            TRANSCODE_DURATION.observe(elapsed)
            logger.info(
                "transcode_job_finished",
                media_id=str(media_id),
                status=media.status,
                elapsed_seconds=round(elapsed, 2),
            )
        except Exception as exc:
            TRANSCODE_TOTAL.labels(status="error").inc()
            logger.error("transcode_job_error", error=str(exc))


async def run_transcode_consumer(settings: Settings, stop_event: asyncio.Event) -> None:
    """RabbitMQ transcode queue consumer worker loop."""
    while not stop_event.is_set():
        try:
            logger.info("connecting_to_rabbitmq", url=settings.rabbitmq_url)
            connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=2)
                queue = await channel.declare_queue(MEDIA_TRANSCODE_QUEUE, durable=True)
                logger.info("transcode_queue_subscribed", queue=MEDIA_TRANSCODE_QUEUE)

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        if stop_event.is_set():
                            break
                        await process_message(message, settings)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warn("rabbitmq_consumer_reconnecting", error=str(exc))
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=5.0)
            except TimeoutError:
                continue


async def run_health_probe(
    checker: InfrastructureDependencyChecker,
    settings: Settings,
    stop_event: asyncio.Event,
) -> None:
    """Periodic dependency health probe loop."""
    while not stop_event.is_set():
        report = await checker.check()
        WORKER_READY.set(1 if report.ready else 0)
        logger.info(
            "worker_probe_completed",
            ready=report.ready,
            dependencies={item.name: item.healthy for item in report.dependencies},
        )
        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=settings.worker_probe_interval_seconds,
            )
        except TimeoutError:
            continue


async def run() -> None:
    settings = get_settings()
    checker = InfrastructureDependencyChecker(engine, settings)
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signal_name, stop_event.set)

    try:
        start_http_server(settings.worker_metrics_port)
        logger.info("worker_started", metrics_port=settings.worker_metrics_port)
    except Exception as exc:
        logger.warn("worker_metrics_server_failed", error=str(exc))

    consumer_task = asyncio.create_task(run_transcode_consumer(settings, stop_event))
    probe_task = asyncio.create_task(run_health_probe(checker, settings, stop_event))

    try:
        await stop_event.wait()
    finally:
        consumer_task.cancel()
        probe_task.cancel()
        await asyncio.gather(consumer_task, probe_task, return_exceptions=True)
        WORKER_READY.set(0)
        await engine.dispose()
        logger.info("worker_stopped")


if __name__ == "__main__":
    asyncio.run(run())
