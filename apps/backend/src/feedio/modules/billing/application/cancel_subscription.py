import asyncio
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import structlog

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    PLAN_MAX_MEMBERS_MAP,
)
from feedio.modules.billing.domain.entities import SubscriptionRecord
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    SubscriptionNotFoundError,
)
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole

logger = structlog.get_logger()


class CancelSubscription:
    """Use case to cancel an active subscription (either immediately or at period end)."""

    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        settings: Settings,
        quota_service: Any | None = None,
        billing_mailer: Any | None = None,
        notification_service: Any | None = None,
        organization_repository: Any | None = None,
    ) -> None:
        self._repository = subscription_repository
        self._settings = settings
        self._quota_service = quota_service
        self._mailer = billing_mailer
        self._notification_service = notification_service
        self._org_repo = organization_repository

    async def _invalidate_cache(self, org_id: UUID) -> None:
        if self._quota_service and hasattr(
            self._quota_service, "invalidate_organization_quota_cache"
        ):
            await self._quota_service.invalidate_organization_quota_cache(org_id)

    async def execute(
        self,
        *,
        context: OrganizationContext,
        immediate: bool = False,
    ) -> SubscriptionRecord:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientBillingPermissionError(
                "Only organization owners and administrators can cancel subscriptions"
            )

        sub = await self._repository.get_by_organization_id(context.organization_id)
        if not sub or sub.plan_tier == "free":
            raise SubscriptionNotFoundError(
                "No active paid subscription found for this organization"
            )

        now = datetime.now(UTC)
        org_id = context.organization_id

        if immediate:
            # Immediate cancellation: downgrade directly to Free (5 GB)
            if (
                sub.provider == "stripe"
                and sub.provider_subscription_id
                and self._settings.stripe_secret_key
            ):
                try:
                    import stripe

                    stripe.api_key = self._settings.stripe_secret_key
                    await asyncio.to_thread(
                        stripe.Subscription.cancel, sub.provider_subscription_id
                    )
                except Exception as e:
                    logger.warn(
                        "stripe_cancel_warning",
                        sub_id=sub.provider_subscription_id,
                        error=str(e),
                    )

            updated_sub = await self._repository.upsert_subscription(
                organization_id=org_id,
                provider=sub.provider,
                provider_customer_id=sub.provider_customer_id,
                provider_subscription_id=sub.provider_subscription_id,
                provider_price_id=None,
                plan_tier="free",
                billing_interval=sub.billing_interval,
                storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES,
                max_members=PLAN_MAX_MEMBERS_MAP.get("free", 5),
                status="canceled",
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=False,
                canceled_at=now,
            )

            await self._repository.update_organization_plan(
                organization_id=org_id,
                plan_tier="free",
                storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES,
            )
            await self._invalidate_cache(org_id)
            logger.info("subscription_canceled_immediate", org_id=str(org_id))
        else:
            # Standard cancellation: retain access until current_period_end
            if (
                sub.provider == "stripe"
                and sub.provider_subscription_id
                and self._settings.stripe_secret_key
            ):
                try:
                    import stripe

                    stripe.api_key = self._settings.stripe_secret_key
                    await asyncio.to_thread(
                        stripe.Subscription.modify,
                        sub.provider_subscription_id,
                        cancel_at_period_end=True,
                    )
                except Exception as e:
                    logger.warn(
                        "stripe_cancel_at_period_end_warning",
                        sub_id=sub.provider_subscription_id,
                        error=str(e),
                    )

            updated_sub = await self._repository.upsert_subscription(
                organization_id=org_id,
                provider=sub.provider,
                provider_customer_id=sub.provider_customer_id,
                provider_subscription_id=sub.provider_subscription_id,
                provider_price_id=sub.provider_price_id,
                plan_tier=sub.plan_tier,
                billing_interval=sub.billing_interval,
                storage_quota_bytes=sub.storage_quota_bytes,
                max_members=sub.max_members,
                status=sub.status,
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=True,
                canceled_at=now,
            )
            logger.info("subscription_canceled_at_period_end", org_id=str(org_id))

        # Send notifications & emails
        effective_date_str = (
            sub.current_period_end.strftime("%d/%m/%Y")
            if (not immediate and sub.current_period_end)
            else now.strftime("%d/%m/%Y")
        )

        if self._notification_service:
            try:
                msg = (
                    "Subscription canceled immediately and reverted to Free (5 GB)."
                    if immediate
                    else (
                        f"Subscription scheduled to cancel. Active benefits remain "
                        f"available through {effective_date_str}."
                    )
                )
                await self._notification_service.create_notification(
                    user_id=context.user_id,
                    organization_id=org_id,
                    type=NotificationType.SUBSCRIPTION_CANCELED,
                    title="Subscription cancellation confirmed",
                    message=msg,
                    link_url=f"/app/organizations/{org_id}/billing",
                    metadata_json={"organization_id": str(org_id), "immediate": immediate},
                )
            except Exception as e:
                logger.warn("cancel_notification_failed", error=str(e))

        if self._mailer and self._org_repo:
            try:
                members_page = await self._org_repo.list_members(org_id, limit=50)
                for member in members_page.items:
                    if member.organization_role in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
                        await self._mailer.send_cancellation_confirmation(
                            email=member.email,
                            organization_name=str(org_id),
                            plan_tier=sub.plan_tier,
                            effective_date_str=effective_date_str,
                        )
            except Exception as e:
                logger.warn("cancel_email_failed", error=str(e))

        return updated_sub
