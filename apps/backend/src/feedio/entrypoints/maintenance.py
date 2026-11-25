import asyncio

import structlog
from redis.asyncio import Redis

from feedio.bootstrap.config import Settings
from feedio.bootstrap.database import session_factory
from feedio.modules.collaboration.infrastructure.valkey_event_publisher import ValkeyEventPublisher
from feedio.modules.media.application.commands.cleanup_orphaned_uploads import (
    CleanupOrphanedUploads,
)
from feedio.modules.media.infrastructure.appwrite_storage import AppwriteStorageService
from feedio.modules.media.infrastructure.local_media_cache import LocalMediaCache
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from feedio.modules.media.infrastructure.repository import SqlMediaRepository
from feedio.modules.media.infrastructure.storage import S3StorageService
from feedio.modules.notifications.application.service import NotificationServiceImpl
from feedio.modules.notifications.infrastructure.repository import SqlAlchemyNotificationRepository
from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository

logger = structlog.get_logger()


async def run_orphan_upload_cleanup_once(settings: Settings) -> dict[str, int]:
    """Execute one pass of DB + Storage + /tmp orphaned upload cleanup."""
    max_age_hours = max(1, settings.orphan_upload_max_age_hours)
    cleaned_db_assets = 0

    async with session_factory() as session:
        repository = SqlMediaRepository(session)
        storage = (
            AppwriteStorageService(settings)
            if settings.storage_provider.lower() == "appwrite"
            else S3StorageService(settings)
        )
        cleaner = CleanupOrphanedUploads(repository=repository, storage=storage)
        cleaned_db_assets = await cleaner.execute(older_than_hours=max_age_hours)
        await session.commit()

    cache = LocalMediaCache(
        cache_dir=settings.media_cache_dir,
        max_bytes=settings.media_cache_max_bytes,
    )
    purged_tmp = await asyncio.to_thread(
        cache.purge_stale_temp_files,
        max_age_hours * 3600,
    )
    return {
        "cleaned_orphaned_assets": cleaned_db_assets,
        "purged_temp_items": purged_tmp,
    }


async def run_orphan_upload_cleaner(
    settings: Settings,
    stop_event: asyncio.Event,
) -> None:
    """Periodic background job (default every 6h) cleaning abandoned uploads >2h old."""
    interval_seconds = max(60, settings.orphan_cleanup_interval_seconds)
    logger.info(
        "orphan_upload_cleaner_started",
        interval_hours=round(interval_seconds / 3600, 2),
        older_than_hours=settings.orphan_upload_max_age_hours,
    )

    while not stop_event.is_set():
        try:
            stats = await run_orphan_upload_cleanup_once(settings)
            logger.info("orphan_upload_cleanup_finished", **stats)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("orphan_upload_cleanup_error", error=str(exc))

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=float(interval_seconds))
        except TimeoutError:
            continue


async def run_subscription_reconciler(
    settings: Settings,
    stop_event: asyncio.Event,
    shared_valkey: Redis | None = None,
) -> None:
    """Periodic background job running every 12h (43200s) to reconcile subscriptions."""
    interval_seconds = getattr(settings, "subscription_reconcile_interval_seconds", 43200)
    logger.info("subscription_reconciler_started", interval_hours=interval_seconds / 3600)

    while not stop_event.is_set():
        try:
            async with session_factory() as session:
                from feedio.modules.billing.application.reconcile_subscriptions import (
                    ReconcileSubscriptions,
                )
                from feedio.modules.billing.infrastructure.mailer import SmtpBillingMailer
                from feedio.modules.billing.infrastructure.repository import (
                    SqlSubscriptionRepository,
                )

                quota_service = StorageQuotaService(
                    repository=SqlMediaRepository(session),
                    valkey_url=settings.valkey_url,
                )
                event_publisher = ValkeyEventPublisher(settings, redis_client=shared_valkey)
                notification_service = NotificationServiceImpl(
                    repository=SqlAlchemyNotificationRepository(session),
                    event_publisher=event_publisher,
                )
                mailer = SmtpBillingMailer(
                    host=settings.smtp_host,
                    port=settings.smtp_port,
                    sender=settings.smtp_sender,
                    web_base_url=settings.web_base_url,
                    username=settings.smtp_username,
                    password=settings.smtp_password,
                    start_tls=settings.smtp_start_tls,
                    use_tls=settings.smtp_use_tls,
                )
                reconciler = ReconcileSubscriptions(
                    subscription_repository=SqlSubscriptionRepository(session),
                    settings=settings,
                    quota_service=quota_service,
                    organization_repository=SqlOrganizationRepository(session),
                    notification_service=notification_service,
                    billing_mailer=mailer,
                )
                result = await reconciler.execute()
                logger.info("subscription_reconcile_finished", **result)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("subscription_reconcile_error", error=str(exc))

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=float(interval_seconds))
        except TimeoutError:
            continue
