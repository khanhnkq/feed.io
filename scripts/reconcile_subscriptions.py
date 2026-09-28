import asyncio
import os
import sys

# Ensure backend source is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../apps/backend/src")))

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import engine, session_factory
from feedio.modules.billing.application.reconcile_subscriptions import ReconcileSubscriptions
from feedio.modules.billing.infrastructure.repository import SqlSubscriptionRepository
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from feedio.modules.media.infrastructure.repository import SqlMediaRepository


async def main() -> None:
    settings = get_settings()
    print("Starting subscription reconciliation job...")
    print(f"Database: {settings.database_url.split('@')[-1]}")
    print(f"Stripe Key Configured: {'Yes' if settings.stripe_secret_key else 'No'}")

    async with session_factory() as session:
        from feedio.modules.billing.infrastructure.mailer import SmtpBillingMailer
        from feedio.modules.collaboration.infrastructure.valkey_event_publisher import ValkeyEventPublisher
        from feedio.modules.notifications.application.service import NotificationServiceImpl
        from feedio.modules.notifications.infrastructure.repository import SqlAlchemyNotificationRepository
        from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository

        quota_service = StorageQuotaService(
            repository=SqlMediaRepository(session),
            valkey_url=settings.valkey_url,
        )
        event_publisher = ValkeyEventPublisher(settings)
        notification_service = NotificationServiceImpl(
            repository=SqlAlchemyNotificationRepository(session),
            event_publisher=event_publisher,
        )
        mailer = SmtpBillingMailer(
            host=settings.smtp_host,
            port=settings.smtp_port,
            sender=settings.smtp_sender,
            web_base_url="http://localhost:3000",
            start_tls=settings.smtp_start_tls,
        )
        org_repo = SqlOrganizationRepository(session)

        reconciler = ReconcileSubscriptions(
            subscription_repository=SqlSubscriptionRepository(session),
            settings=settings,
            quota_service=quota_service,
            organization_repository=org_repo,
            notification_service=notification_service,
            billing_mailer=mailer,
        )
        result = await reconciler.execute()
        print("\nReconciliation Results:")
        print(f"  - Total checked:     {result['total_checked']}")
        print(f"  - Reconciled dates:  {result['reconciled_dates']}")
        print(f"  - Reminded (<=7d):   {result['reminded_7d']}")
        print(f"  - Downgraded:        {result['downgraded']}")

    await engine.dispose()
    print("Reconciliation complete.")


if __name__ == "__main__":
    asyncio.run(main())
