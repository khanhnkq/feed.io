import json
from typing import Any
from uuid import UUID, uuid4

from feedio.modules.billing.application.ports import PaymentGatewayPort
from feedio.modules.billing.domain.errors import WebhookVerificationError


class MockPaymentAdapter(PaymentGatewayPort):
    """Mock payment gateway adapter for local development and offline automated testing."""

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
        session_id = f"mock_cs_{uuid4().hex[:16]}"
        separator = "&" if "?" in success_url else "?"
        return (
            f"{success_url}{separator}session_id={session_id}"
            f"&org_id={organization_id}&org={organization_slug}"
            f"&plan={plan_tier}&interval={billing_interval}"
        )

    async def create_customer_portal_session(
        self,
        *,
        customer_id: str,
        return_url: str,
    ) -> str:
        separator = "&" if "?" in return_url else "?"
        portal_session = f"mock_portal_{uuid4().hex[:16]}"
        return f"{return_url}{separator}portal_session={portal_session}&customer={customer_id}"

    def construct_webhook_event(
        self,
        *,
        payload: bytes,
        signature_header: str,
    ) -> dict[str, Any]:
        if signature_header == "invalid_sig":
            raise WebhookVerificationError("Invalid mock webhook signature")
        try:
            data = json.loads(payload.decode("utf-8"))
            if not isinstance(data, dict):
                raise WebhookVerificationError("Webhook payload must be a JSON object")
            return data
        except Exception as e:
            raise WebhookVerificationError(f"Could not parse webhook payload: {e}") from e
