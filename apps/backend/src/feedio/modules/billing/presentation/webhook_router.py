from collections.abc import Callable
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status

from feedio.bootstrap.config import Settings, get_settings
from feedio.modules.billing.application.ports import PaymentGatewayPort
from feedio.modules.billing.application.process_webhook_event import ProcessWebhookEvent
from feedio.modules.billing.domain.errors import WebhookVerificationError
from feedio.modules.billing.presentation.schemas import MockWebhookTriggerRequest


def create_webhook_router(
    payment_gateway_provider: Callable[[], PaymentGatewayPort],
    process_webhook_provider: Callable[..., Any],
    settings_provider: Callable[[], Settings] = get_settings,
) -> APIRouter:
    router = APIRouter(tags=["billing-webhooks"])

    @router.post("/webhooks/stripe")
    async def stripe_webhook(
        request: Request,
        gateway: Annotated[PaymentGatewayPort, Depends(payment_gateway_provider)],
        processor: Annotated[ProcessWebhookEvent, Depends(process_webhook_provider)],
    ) -> dict[str, Any]:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature", "")
        try:
            event = gateway.construct_webhook_event(payload=payload, signature_header=sig_header)
        except WebhookVerificationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

        result = await processor.execute(event=event, provider="stripe")
        return {"received": True, "result": result}

    @router.post("/webhooks/mock")
    async def mock_webhook(
        payload: MockWebhookTriggerRequest,
        processor: Annotated[ProcessWebhookEvent, Depends(process_webhook_provider)],
        settings: Annotated[Settings, Depends(settings_provider)],
    ) -> dict[str, Any]:
        if not settings.is_development or settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Mock webhook endpoint is disabled in production.",
            )

        mock_event = {
            "id": f"evt_mock_{uuid4().hex[:12]}",
            "type": payload.event_type,
            "data": {
                "object": {
                    "id": f"sub_mock_{uuid4().hex[:12]}",
                    "customer": f"cus_mock_{uuid4().hex[:12]}",
                    "subscription": f"sub_mock_{uuid4().hex[:12]}",
                    "metadata": {
                        "organization_id": str(payload.organization_id),
                        "plan_tier": payload.plan_tier,
                        "billing_interval": payload.billing_interval,
                    },
                }
            },
        }
        result = await processor.execute(event=mock_event, provider="mock")
        return {"received": True, "result": result}

    return router
