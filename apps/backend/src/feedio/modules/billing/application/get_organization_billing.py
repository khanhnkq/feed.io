from typing import Any

from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    PLAN_MAX_MEMBERS_MAP,
)
from feedio.modules.billing.domain.entities import BillingOverview
from feedio.modules.organizations.application.ports import OrganizationRepository
from feedio.modules.organizations.domain.value_objects import OrganizationContext


class GetOrganizationBilling:
    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        organization_repository: OrganizationRepository,
        media_repository: Any,
        platform_settings: Any = None,
    ) -> None:
        self._subscription_repo = subscription_repository
        self._org_repo = organization_repository
        self._media_repo = media_repository
        self._platform_settings = platform_settings

    async def execute(self, *, context: OrganizationContext) -> BillingOverview:
        sub = await self._subscription_repo.get_by_organization_id(context.organization_id)
        org = await self._org_repo.get_by_id(context.organization_id, context.user_id)

        plan_tier = getattr(org, "plan_tier", "free") if org else "free"
        storage_quota_bytes = (
            getattr(org, "storage_quota_bytes", DEFAULT_FREE_STORAGE_QUOTA_BYTES)
            if org
            else DEFAULT_FREE_STORAGE_QUOTA_BYTES
        )

        storage_used_bytes = 0
        if hasattr(self._media_repo, "get_organization_storage_usage_bytes"):
            storage_used_bytes = await self._media_repo.get_organization_storage_usage_bytes(
                context.organization_id
            )

        active_members_count = 1
        if hasattr(self._org_repo, "count_total_members_and_pending"):
            active_members_count = await self._org_repo.count_total_members_and_pending(
                context.organization_id
            )

        storage_usage_percentage = 0.0
        if storage_quota_bytes > 0:
            storage_usage_percentage = round((storage_used_bytes / storage_quota_bytes) * 100, 2)

        max_members = PLAN_MAX_MEMBERS_MAP.get(plan_tier, 5 if plan_tier == "free" else None)
        status = sub.status if sub else "active"
        billing_interval = sub.billing_interval if sub else None
        current_period_end = sub.current_period_end if sub else None
        cancel_at_period_end = sub.cancel_at_period_end if sub else False
        has_payment_method = bool(sub and sub.provider_customer_id)

        payments_enabled = True
        if self._platform_settings and hasattr(self._platform_settings, "is_payments_enabled"):
            payments_enabled = await self._platform_settings.is_payments_enabled()

        return BillingOverview(
            organization_id=context.organization_id,
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            status=status,
            storage_used_bytes=storage_used_bytes,
            storage_quota_bytes=storage_quota_bytes,
            storage_usage_percentage=storage_usage_percentage,
            active_members_count=active_members_count,
            max_members=max_members,
            current_period_end=current_period_end,
            cancel_at_period_end=cancel_at_period_end,
            has_payment_method=has_payment_method,
            payments_enabled=payments_enabled,
        )
