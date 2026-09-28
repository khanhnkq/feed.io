from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from feedio.modules.billing.domain.entities import SubscriptionRecord


class PaymentGatewayPort(Protocol):
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
    ) -> str: ...

    async def create_customer_portal_session(
        self,
        *,
        customer_id: str,
        return_url: str,
    ) -> str: ...

    def construct_webhook_event(
        self,
        *,
        payload: bytes,
        signature_header: str,
    ) -> dict[str, Any]: ...


class SubscriptionRepository(Protocol):
    async def get_by_organization_id(
        self,
        organization_id: UUID,
    ) -> SubscriptionRecord | None: ...

    async def get_by_provider_subscription_id(
        self,
        subscription_id: str,
    ) -> SubscriptionRecord | None: ...

    async def get_by_provider_customer_id(
        self,
        customer_id: str,
    ) -> SubscriptionRecord | None: ...

    async def list_active_non_free_subscriptions(
        self,
    ) -> list[SubscriptionRecord]: ...

    async def upsert_subscription(
        self,
        *,
        organization_id: UUID,
        provider: str,
        provider_customer_id: str | None,
        provider_subscription_id: str | None,
        provider_price_id: str | None,
        plan_tier: str,
        billing_interval: str,
        storage_quota_bytes: int,
        max_members: int | None,
        status: str,
        current_period_start: datetime | None,
        current_period_end: datetime | None,
        cancel_at_period_end: bool = False,
        canceled_at: datetime | None = None,
    ) -> SubscriptionRecord: ...

    async def is_event_processed(
        self,
        provider: str,
        event_id: str,
    ) -> bool: ...

    async def record_event(
        self,
        *,
        organization_id: UUID | None,
        provider: str,
        event_id: str,
        event_type: str,
        payload: dict[str, Any],
        status: str,
        error_message: str | None = None,
    ) -> None: ...

    async def update_organization_plan(
        self,
        organization_id: UUID,
        plan_tier: str,
        storage_quota_bytes: int,
    ) -> None: ...
