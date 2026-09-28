
from typing import Any

from feedio.modules.billing.application.ports import PaymentGatewayPort
from feedio.modules.billing.domain.constants import VALID_BILLING_INTERVALS, VALID_PLAN_TIERS
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    InvalidBillingIntervalError,
    InvalidPlanTierError,
    PaymentGatewayError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole


class CreateCheckoutSession:
    def __init__(
        self,
        payment_gateway: PaymentGatewayPort,
        platform_settings: Any = None,
    ) -> None:
        self._gateway = payment_gateway
        self._platform_settings = platform_settings

    async def execute(
        self,
        *,
        context: OrganizationContext,
        organization_slug: str,
        user_email: str,
        plan_tier: str,
        billing_interval: str,
        success_url: str,
        cancel_url: str,
    ) -> str:
        if (
            self._platform_settings
            and hasattr(self._platform_settings, "is_payments_enabled")
            and not await self._platform_settings.is_payments_enabled()
        ):
            raise PaymentGatewayError(
                "Payments are currently disabled for platform testing."
            )

        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientBillingPermissionError(
                "Only organization owners and administrators can manage subscriptions"
            )

        if plan_tier not in VALID_PLAN_TIERS or plan_tier == "free":
            raise InvalidPlanTierError(
                f"Invalid or free plan tier '{plan_tier}'. Please select a paid plan tier."
            )

        if billing_interval not in VALID_BILLING_INTERVALS:
            raise InvalidBillingIntervalError(
                f"Invalid billing interval '{billing_interval}'. Must be 'monthly' or 'yearly'."
            )

        return await self._gateway.create_checkout_session(
            organization_id=context.organization_id,
            organization_slug=organization_slug,
            user_email=user_email,
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            success_url=success_url,
            cancel_url=cancel_url,
        )
