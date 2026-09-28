import asyncio
from typing import Any
from uuid import UUID

import structlog

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.domain.entities import SubscriptionRecord
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    SubscriptionNotFoundError,
)
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole

logger = structlog.get_logger()


class ResumeSubscription:
    """Use case to un-cancel a subscription that was set to cancel at period end."""

    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        settings: Settings,
        quota_service: Any | None = None,
        notification_service: Any | None = None,
    ) -> None:
        self._repository = subscription_repository
        self._settings = settings
        self._quota_service = quota_service
        self._notification_service = notification_service

    async def _invalidate_cache(self, org_id: UUID) -> None:
        if self._quota_service and hasattr(
            self._quota_service, "invalidate_organization_quota_cache"
        ):
            await self._quota_service.invalidate_organization_quota_cache(org_id)

    async def execute(
        self,
        *,
        context: OrganizationContext,
    ) -> SubscriptionRecord:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientBillingPermissionError(
                "Only organization owners and administrators can manage subscriptions"
            )

        sub = await self._repository.get_by_organization_id(context.organization_id)
        if not sub or sub.plan_tier == "free":
            raise SubscriptionNotFoundError(
                "No active paid subscription found to resume"
            )

        if not sub.cancel_at_period_end:
            return sub

        org_id = context.organization_id

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
                    cancel_at_period_end=False,
                )
            except Exception as e:
                logger.warn(
                    "stripe_resume_warning",
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
            cancel_at_period_end=False,
            canceled_at=None,
        )

        await self._invalidate_cache(org_id)
        logger.info("subscription_resumed", org_id=str(org_id))

        if self._notification_service:
            try:
                end_str = (
                    sub.current_period_end.strftime("%d/%m/%Y")
                    if sub.current_period_end
                    else ""
                )
                await self._notification_service.create_notification(
                    user_id=context.user_id,
                    organization_id=org_id,
                    type=NotificationType.SUBSCRIPTION_RENEWED,
                    title="Subscription cancellation reversed",
                    message=(
                        f"Plan {sub.plan_tier} cancellation has been reversed. "
                        f"Subscription active through {end_str}."
                    ),
                    link_url=f"/app/organizations/{org_id}/billing",
                    metadata_json={"organization_id": str(org_id)},
                )
            except Exception as e:
                logger.warn("resume_notification_failed", error=str(e))

        return updated_sub
