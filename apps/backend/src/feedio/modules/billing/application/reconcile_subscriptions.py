import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

import structlog

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.application.process_webhook_event import _extract_period_dates
from feedio.modules.billing.domain.constants import DEFAULT_FREE_STORAGE_QUOTA_BYTES
from feedio.modules.billing.domain.entities import SubscriptionRecord
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import OrganizationRole

logger = structlog.get_logger()


def _format_bytes(bytes_val: int) -> str:
    gb = bytes_val / (1024**3)
    if gb >= 1000:
        return f"{gb / 1000:.1f} TB"
    return f"{int(gb)} GB"


class ReconcileSubscriptions:
    """Periodic job running every 12h to reconcile subscriptions, enforce no-auto-renewal,

    and send 7-day expiration reminders via email and in-app notifications.
    """

    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        settings: Settings,
        quota_service: Any | None = None,
        organization_repository: Any | None = None,
        notification_service: Any | None = None,
        billing_mailer: Any | None = None,
    ) -> None:
        self._repository = subscription_repository
        self._settings = settings
        self._quota_service = quota_service
        self._org_repo = organization_repository
        self._notification_service = notification_service
        self._mailer = billing_mailer

    async def _invalidate_cache(self, org_id: UUID) -> None:
        if self._quota_service and hasattr(
            self._quota_service, "invalidate_organization_quota_cache"
        ):
            await self._quota_service.invalidate_organization_quota_cache(org_id)

    async def execute(self) -> dict[str, Any]:
        """Reconcile all active non-free subscriptions.

        1. Fixes missing current_period_end dates by querying Stripe or estimating from interval.
        2. Checks for expired subscriptions (current_period_end < now):
           - NO AUTO-RENEWAL: Automatically downgrades organization to free (5 GB).
           - Sends expiration notice email and in-app notification.
        3. Checks for subscriptions expiring in <= 7 days:
           - Sends 7-day expiration reminder email and in-app notification (deduplicated).
        """
        now = datetime.now(UTC)
        subs = await self._repository.list_active_non_free_subscriptions()

        reconciled_count = 0
        downgraded_count = 0
        reminded_count = 0

        for sub in subs:
            # Case 1: missing current_period_end -> backfill
            if sub.current_period_end is None:
                if (
                    sub.provider == "stripe"
                    and sub.provider_subscription_id
                    and self._settings.stripe_secret_key
                ):
                    try:
                        import stripe

                        stripe.api_key = self._settings.stripe_secret_key
                        sub_obj = await asyncio.to_thread(
                            stripe.Subscription.retrieve, sub.provider_subscription_id
                        )
                        sub_any = cast(Any, sub_obj)
                        sub_dict: dict[str, Any] = (
                            sub_any.to_dict()
                            if hasattr(sub_any, "to_dict")
                            else dict(sub_any)
                        )
                        start_dt, end_dt = _extract_period_dates(
                            sub_dict, sub.billing_interval
                        )

                        await self._repository.upsert_subscription(
                            organization_id=sub.organization_id,
                            provider=sub.provider,
                            provider_customer_id=sub.provider_customer_id,
                            provider_subscription_id=sub.provider_subscription_id,
                            provider_price_id=sub.provider_price_id,
                            plan_tier=sub.plan_tier,
                            billing_interval=sub.billing_interval,
                            storage_quota_bytes=sub.storage_quota_bytes,
                            max_members=sub.max_members,
                            status=sub_dict.get("status", sub.status),
                            current_period_start=start_dt,
                            current_period_end=end_dt,
                            cancel_at_period_end=sub_dict.get(
                                "cancel_at_period_end", sub.cancel_at_period_end
                            ),
                        )
                        await self._invalidate_cache(sub.organization_id)
                        sub = (
                            sub._replace(current_period_end=end_dt)
                            if hasattr(sub, "_replace")
                            else sub
                        )
                        reconciled_count += 1
                        logger.info(
                            "reconciled_missing_period_from_stripe",
                            org_id=str(sub.organization_id),
                            period_end=str(end_dt),
                        )
                    except Exception as e:
                        logger.warn(
                            "stripe_sub_retrieve_failed",
                            sub_id=sub.provider_subscription_id,
                            error=str(e),
                        )

                if sub.current_period_end is None:
                    # Fallback for mock or unconfigured Stripe: set period_end = start + 30 days
                    start_dt = sub.current_period_start or now
                    end_dt = start_dt + (
                        timedelta(days=365)
                        if sub.billing_interval == "yearly"
                        else timedelta(days=30)
                    )
                    await self._repository.upsert_subscription(
                        organization_id=sub.organization_id,
                        provider=sub.provider,
                        provider_customer_id=sub.provider_customer_id,
                        provider_subscription_id=sub.provider_subscription_id,
                        provider_price_id=sub.provider_price_id,
                        plan_tier=sub.plan_tier,
                        billing_interval=sub.billing_interval,
                        storage_quota_bytes=sub.storage_quota_bytes,
                        max_members=sub.max_members,
                        status=sub.status,
                        current_period_start=start_dt,
                        current_period_end=end_dt,
                        cancel_at_period_end=sub.cancel_at_period_end,
                    )
                    await self._invalidate_cache(sub.organization_id)
                    reconciled_count += 1
                    continue

            # Case 2: Subscription has EXPIRED (current_period_end <= now)
            # Rule: NO AUTO-RENEWAL -> Immediately downgrade to Free tier (5 GB)
            if sub.current_period_end and sub.current_period_end <= now:
                if (
                    sub.provider == "stripe"
                    and sub.provider_subscription_id
                    and self._settings.stripe_secret_key
                ):
                    try:
                        import stripe

                        stripe.api_key = self._settings.stripe_secret_key
                        # Ensure Stripe does not charge recurring
                        await asyncio.to_thread(
                            stripe.Subscription.cancel, sub.provider_subscription_id
                        )
                    except Exception as e:
                        logger.warn(
                            "stripe_cancel_expired_error",
                            sub_id=sub.provider_subscription_id,
                            error=str(e),
                        )

                await self._downgrade_to_free(sub)
                await self._notify_expired(sub)
                downgraded_count += 1
                continue

            # Case 3: Subscription is currently ACTIVE (current_period_end > now)
            # Check 7-day expiration reminder: now <= current_period_end <= now + 7 days
            if (
                sub.current_period_end
                and now < sub.current_period_end <= now + timedelta(days=7)
            ):
                sent = await self._send_7d_reminder_if_needed(sub, now)
                if sent:
                    reminded_count += 1

            # Sync any external cancellation from Stripe if present
            if (
                sub.provider == "stripe"
                and sub.provider_subscription_id
                and self._settings.stripe_secret_key
            ):
                try:
                    import stripe

                    stripe.api_key = self._settings.stripe_secret_key
                    sub_obj = await asyncio.to_thread(
                        stripe.Subscription.retrieve, sub.provider_subscription_id
                    )
                    sub_any = cast(Any, sub_obj)
                    sub_dict = (
                        sub_any.to_dict()
                        if hasattr(sub_any, "to_dict")
                        else dict(sub_any)
                    )
                    stripe_status = sub_dict.get("status", sub.status)
                    if stripe_status in ("canceled", "unpaid", "incomplete_expired"):
                        await self._downgrade_to_free(sub)
                        downgraded_count += 1
                    elif sub_dict.get("cancel_at_period_end") != sub.cancel_at_period_end:
                        await self._repository.upsert_subscription(
                            organization_id=sub.organization_id,
                            provider=sub.provider,
                            provider_customer_id=sub.provider_customer_id,
                            provider_subscription_id=sub.provider_subscription_id,
                            provider_price_id=sub.provider_price_id,
                            plan_tier=sub.plan_tier,
                            billing_interval=sub.billing_interval,
                            storage_quota_bytes=sub.storage_quota_bytes,
                            max_members=sub.max_members,
                            status=stripe_status,
                            current_period_start=sub.current_period_start,
                            current_period_end=sub.current_period_end,
                            cancel_at_period_end=sub_dict.get("cancel_at_period_end", False),
                        )
                        await self._invalidate_cache(sub.organization_id)
                except Exception as e:
                    logger.warn(
                        "stripe_sub_sync_warning",
                        sub_id=sub.provider_subscription_id,
                        error=str(e),
                    )

        return {
            "total_checked": len(subs),
            "reconciled_dates": reconciled_count,
            "reminded_7d": reminded_count,
            "downgraded": downgraded_count,
        }

    async def _send_7d_reminder_if_needed(
        self, sub: SubscriptionRecord, now: datetime
    ) -> bool:
        """Check if 7-day reminder was already sent for this period.

        If not, send email & notification.
        """
        if not sub.current_period_end:
            return False

        reminder_event_id = (
            f"reminder_7d_{sub.organization_id}_{int(sub.current_period_end.timestamp())}"
        )
        if await self._repository.is_event_processed("system", reminder_event_id):
            return False

        days_left = max(1, (sub.current_period_end - now).days)
        expiration_date_str = sub.current_period_end.strftime("%d/%m/%Y")
        quota_str = _format_bytes(sub.storage_quota_bytes)

        org_name = str(sub.organization_id)
        org_slug = "org"
        members = []

        if self._org_repo:
            try:
                members_page = await self._org_repo.list_members(sub.organization_id, limit=50)
                members = [
                    m for m in members_page.items
                    if m.organization_role in (OrganizationRole.OWNER, OrganizationRole.ADMIN)
                ]
            except Exception as e:
                logger.warn("fetch_members_for_reminder_error", error=str(e))

        web_base_url = "http://localhost:3000"
        renew_url = f"{web_base_url}/app/organizations/{org_slug}/billing"

        for member in members:
            # 1. In-app notification
            if self._notification_service:
                try:
                    await self._notification_service.create_notification(
                        user_id=member.user_id,
                        organization_id=sub.organization_id,
                        type=NotificationType.SUBSCRIPTION_EXPIRING,
                        title=f"Subscription expiring soon ({days_left} days left)",
                        message=(
                            f"Your {sub.plan_tier} plan will expire on "
                            f"{expiration_date_str}. Note that Feedi does NOT automatically "
                            f"renew subscriptions. Please renew manually to prevent disruption."
                        ),
                        link_url=f"/app/organizations/{sub.organization_id}/billing",
                        metadata_json={
                            "organization_id": str(sub.organization_id),
                            "days_left": days_left,
                            "expiration_date": sub.current_period_end.isoformat(),
                        },
                    )
                except Exception as e:
                    logger.warn(
                        "send_reminder_noti_failed",
                        user_id=str(member.user_id),
                        error=str(e),
                    )

            # 2. Email alert via SMTP
            if self._mailer:
                try:
                    await self._mailer.send_expiring_reminder(
                        email=member.email,
                        organization_name=org_name,
                        plan_tier=sub.plan_tier,
                        days_left=days_left,
                        expiration_date_str=expiration_date_str,
                        quota_str=quota_str,
                        renew_url=renew_url,
                    )
                except Exception as e:
                    logger.warn(
                        "send_reminder_email_failed",
                        email=member.email,
                        error=str(e),
                    )

        # Record event in subscription_events so this period won't be reminded again
        await self._repository.record_event(
            organization_id=sub.organization_id,
            provider="system",
            event_id=reminder_event_id,
            event_type="subscription_expiring_7d_reminder",
            payload={
                "days_left": days_left,
                "expiration_date": sub.current_period_end.isoformat(),
            },
            status="processed",
        )
        logger.info(
            "sent_7d_expiration_reminder",
            org_id=str(sub.organization_id),
            days_left=days_left,
            period_end=str(sub.current_period_end),
        )
        return True

    async def _notify_expired(self, sub: SubscriptionRecord) -> None:
        """Send notification when subscription expires without renewal."""
        if not self._org_repo:
            return

        try:
            members_page = await self._org_repo.list_members(sub.organization_id, limit=50)
            admin_members = [
                m for m in members_page.items
                if m.organization_role in (OrganizationRole.OWNER, OrganizationRole.ADMIN)
            ]
            for member in admin_members:
                if self._notification_service:
                    await self._notification_service.create_notification(
                        user_id=member.user_id,
                        organization_id=sub.organization_id,
                        type=NotificationType.SUBSCRIPTION_CANCELED,
                        title="Subscription expired",
                        message=(
                            f"Your organization's {sub.plan_tier} plan has expired and reverted "
                            f"to Free (5 GB). You can renew at any time."
                        ),
                        link_url=f"/app/organizations/{sub.organization_id}/billing",
                        metadata_json={"organization_id": str(sub.organization_id)},
                    )
        except Exception as e:
            logger.warn("notify_expired_failed", error=str(e))

    async def _downgrade_to_free(self, sub: SubscriptionRecord) -> None:
        await self._repository.upsert_subscription(
            organization_id=sub.organization_id,
            provider=sub.provider,
            provider_customer_id=sub.provider_customer_id,
            provider_subscription_id=sub.provider_subscription_id,
            provider_price_id=None,
            plan_tier="free",
            billing_interval=sub.billing_interval,
            storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES,
            max_members=5,
            status="canceled",
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=False,
            canceled_at=datetime.now(UTC),
        )
        await self._repository.update_organization_plan(
            organization_id=sub.organization_id,
            plan_tier="free",
            storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES,
        )
        await self._invalidate_cache(sub.organization_id)
        logger.info(
            "downgraded_expired_subscription",
            org_id=str(sub.organization_id),
            previous_plan=sub.plan_tier,
        )
