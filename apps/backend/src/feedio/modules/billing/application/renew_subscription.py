from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import structlog

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.create_checkout_session import CreateCheckoutSession
from feedio.modules.billing.application.ports import PaymentGatewayPort, SubscriptionRepository
from feedio.modules.billing.domain.constants import (
    PLAN_MAX_MEMBERS_MAP,
    PLAN_QUOTAS_MAP,
    PRO_100GB_STORAGE_QUOTA_BYTES,
)
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    PaymentGatewayError,
    SubscriptionNotFoundError,
)
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole

logger = structlog.get_logger()


class RenewSubscription:
    """Use case to manually renew an active or expiring subscription."""

    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        payment_gateway: PaymentGatewayPort,
        settings: Settings,
        quota_service: Any | None = None,
        platform_settings: Any | None = None,
        billing_mailer: Any | None = None,
        notification_service: Any | None = None,
        organization_repository: Any | None = None,
    ) -> None:
        self._repository = subscription_repository
        self._gateway = payment_gateway
        self._settings = settings
        self._quota_service = quota_service
        self._platform_settings = platform_settings
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
        organization_slug: str,
        user_email: str,
        billing_interval: str | None = None,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientBillingPermissionError(
                "Only organization owners and administrators can renew subscriptions"
            )

        if (
            self._platform_settings
            and hasattr(self._platform_settings, "is_payments_enabled")
            and not await self._platform_settings.is_payments_enabled()
        ):
            raise PaymentGatewayError(
                "Payments are currently disabled for platform testing."
            )

        sub = await self._repository.get_by_organization_id(context.organization_id)
        if not sub or sub.plan_tier == "free":
            raise SubscriptionNotFoundError(
                "No active paid subscription found to renew. Please upgrade via checkout."
            )

        plan_tier = sub.plan_tier
        interval = billing_interval or (sub.billing_interval if sub else "monthly")
        org_id = context.organization_id
        now = datetime.now(UTC)

        # If Stripe is configured and provider is stripe: generate Checkout URL
        if (
            self._settings.stripe_secret_key
            and sub
            and sub.provider == "stripe"
        ):
            checkout_use_case = CreateCheckoutSession(
                payment_gateway=self._gateway,
                platform_settings=self._platform_settings,
                settings=self._settings,
            )
            checkout_url = await checkout_use_case.execute(
                context=context,
                organization_slug=organization_slug,
                user_email=user_email,
                plan_tier=plan_tier,
                billing_interval=interval,
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return {
                "status": "checkout_required",
                "checkout_url": checkout_url,
                "plan_tier": plan_tier,
            }

        # In production, disallow free mock renewal without payment
        if not self._settings.is_development or self._settings.is_production:
            raise PaymentGatewayError(
                "Online renewal payment gateway is not configured for production."
            )

        # Otherwise (mock in development mode): extend period seamlessly
        delta = timedelta(days=365) if interval == "yearly" else timedelta(days=30)
        has_future_end = bool(
            sub and sub.current_period_end and sub.current_period_end > now
        )
        base_date = sub.current_period_end if (has_future_end and sub) else now
        new_period_end = base_date + delta
        new_period_start = (
            sub.current_period_start
            if (has_future_end and sub and sub.current_period_start)
            else now
        )

        storage_quota_bytes = PLAN_QUOTAS_MAP.get(
            plan_tier, PRO_100GB_STORAGE_QUOTA_BYTES
        )
        max_members = PLAN_MAX_MEMBERS_MAP.get(plan_tier, None)

        await self._repository.upsert_subscription(
            organization_id=org_id,
            provider=sub.provider if sub else "mock",
            provider_customer_id=sub.provider_customer_id if sub else None,
            provider_subscription_id=sub.provider_subscription_id if sub else None,
            provider_price_id=None,
            plan_tier=plan_tier,
            billing_interval=interval,
            storage_quota_bytes=storage_quota_bytes,
            max_members=max_members,
            status="active",
            current_period_start=new_period_start,
            current_period_end=new_period_end,
            cancel_at_period_end=False,
            canceled_at=None,
        )

        await self._repository.update_organization_plan(
            organization_id=org_id,
            plan_tier=plan_tier,
            storage_quota_bytes=storage_quota_bytes,
        )
        await self._invalidate_cache(org_id)
        logger.info(
            "subscription_renewed_direct",
            org_id=str(org_id),
            new_period_end=str(new_period_end),
        )

        # Send in-app notification & confirmation email
        if self._notification_service:
            try:
                await self._notification_service.create_notification(
                    user_id=context.user_id,
                    organization_id=org_id,
                    type=NotificationType.SUBSCRIPTION_RENEWED,
                    title="Subscription renewed successfully!",
                    message=(
                        f"Plan {plan_tier} has been renewed successfully "
                        f"through {new_period_end.strftime('%b %d, %Y')}."
                    ),
                    link_url=f"/app/organizations/{organization_slug}/billing",
                    metadata_json={"organization_id": str(org_id)},
                )
            except Exception as e:
                logger.warn("renew_notification_failed", error=str(e))

        if self._mailer and self._org_repo:
            try:
                members_page = await self._org_repo.list_members(org_id, limit=50)
                for member in members_page.items:
                    if member.organization_role in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
                        await self._mailer.send_renewal_confirmation(
                            email=member.email,
                            organization_name=organization_slug,
                            plan_tier=plan_tier,
                            new_expiration_date_str=new_period_end.strftime("%d/%m/%Y"),
                            quota_str=f"{storage_quota_bytes // (1024**3)} GB",
                        )
            except Exception as e:
                logger.warn("renew_email_failed", error=str(e))

        return {
            "status": "renewed",
            "checkout_url": None,
            "plan_tier": plan_tier,
            "current_period_end": new_period_end.isoformat(),
        }
