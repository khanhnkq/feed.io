import asyncio
from decimal import Decimal
from typing import Any
from uuid import UUID

import stripe

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.ports import PaymentGatewayPort
from feedio.modules.billing.domain.errors import PaymentGatewayError, WebhookVerificationError


def _to_json_safe(obj: Any) -> Any:
    if hasattr(obj, "to_dict") and callable(obj.to_dict):
        obj = obj.to_dict()
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 else int(obj)
    if isinstance(obj, dict):
        return {str(k): _to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_to_json_safe(v) for v in obj]
    return obj


class StripePaymentAdapter(PaymentGatewayPort):
    """Production Stripe payment gateway adapter."""

    def __init__(self, settings: Settings) -> None:
        self._secret_key = settings.stripe_secret_key or ""
        self._webhook_secret = settings.stripe_webhook_secret or ""
        self._settings = settings
        stripe.api_key = self._secret_key

    def _get_price_id(self, plan_tier: str, billing_interval: str) -> str:
        price_map = {
            ("pro_100gb", "monthly"): self._settings.stripe_price_pro_100gb_monthly,
            ("pro_100gb", "yearly"): self._settings.stripe_price_pro_100gb_yearly,
            ("pro_500gb", "monthly"): self._settings.stripe_price_pro_500gb_monthly,
            ("pro_500gb", "yearly"): self._settings.stripe_price_pro_500gb_yearly,
            ("pro_1tb", "monthly"): self._settings.stripe_price_pro_1tb_monthly,
            ("pro_1tb", "yearly"): self._settings.stripe_price_pro_1tb_yearly,
        }
        price_id = price_map.get((plan_tier, billing_interval))
        if not price_id:
            # Fallback for dev / unconfigured environments
            return f"price_{plan_tier}_{billing_interval}"
        return price_id

    async def create_checkout_session(
        self,
        *,
        organization_id: UUID,
        organization_slug: str,
        user_email: str,
        plan_tier: str,
        billing_interval: str,
        success_url: str,
        cancel_url: str,
    ) -> str:
        if not self._secret_key:
            raise PaymentGatewayError("Stripe secret key is not configured")

        price_id = self._get_price_id(plan_tier, billing_interval)

        def _create() -> str:
            session = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                customer_email=user_email,
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "organization_id": str(organization_id),
                    "organization_slug": organization_slug,
                    "plan_tier": plan_tier,
                    "billing_interval": billing_interval,
                },
                subscription_data={
                    "metadata": {
                        "organization_id": str(organization_id),
                        "plan_tier": plan_tier,
                        "billing_interval": billing_interval,
                    }
                },
            )
            if not session.url:
                raise PaymentGatewayError("Stripe session created without URL")
            return str(session.url)

        try:
            return await asyncio.to_thread(_create)
        except Exception as e:
            if isinstance(e, PaymentGatewayError):
                raise
            raise PaymentGatewayError(f"Stripe checkout error: {e}") from e

    async def create_customer_portal_session(
        self,
        *,
        customer_id: str,
        return_url: str,
    ) -> str:
        if not self._secret_key:
            raise PaymentGatewayError("Stripe secret key is not configured")

        def _create() -> str:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            if not session.url:
                raise PaymentGatewayError("Stripe portal session created without URL")
            return str(session.url)

        try:
            return await asyncio.to_thread(_create)
        except Exception as e:
            if isinstance(e, PaymentGatewayError):
                raise
            raise PaymentGatewayError(f"Stripe portal error: {e}") from e

    def construct_webhook_event(
        self,
        *,
        payload: bytes,
        signature_header: str,
    ) -> dict[str, Any]:
        if not self._webhook_secret:
            raise WebhookVerificationError("Stripe webhook secret is not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature_header,
                secret=self._webhook_secret,
            )
            if hasattr(event, "to_dict"):
                return _to_json_safe(dict(event.to_dict()))
            return _to_json_safe(dict(event))
        except stripe.SignatureVerificationError as e:
            raise WebhookVerificationError(f"Invalid Stripe signature: {e}") from e
        except Exception as e:
            raise WebhookVerificationError(f"Failed to parse Stripe webhook: {e}") from e
