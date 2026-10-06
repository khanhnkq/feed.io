import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    PLAN_MAX_MEMBERS_MAP,
    PLAN_QUOTAS_MAP,
    PRO_100GB_STORAGE_QUOTA_BYTES,
)
from feedio.modules.billing.domain.errors import WebhookVerificationError


def _from_timestamp(ts: int | float | None) -> datetime | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=UTC)


def _extract_period_dates(
    data: dict[str, Any], billing_interval: str = "monthly"
) -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    start_ts = data.get("current_period_start")
    end_ts = data.get("current_period_end")

    # In newer Stripe API versions, period timestamps are nested in items.data[0]
    if not end_ts and "items" in data:
        items_data = data.get("items", {}).get("data", [])
        if items_data and isinstance(items_data, list):
            first_item = items_data[0]
            start_ts = start_ts or first_item.get("current_period_start")
            end_ts = end_ts or first_item.get("current_period_end")

    # Or check lines in invoice
    if not end_ts and "lines" in data:
        lines_data = data.get("lines", {}).get("data", [])
        if lines_data and isinstance(lines_data, list):
            first_line = lines_data[0]
            period = first_line.get("period", {})
            start_ts = start_ts or period.get("start")
            end_ts = end_ts or period.get("end")

    start_ts = start_ts or data.get("start_date") or data.get("created")
    start_dt = _from_timestamp(start_ts) or now

    delta = timedelta(days=365) if billing_interval == "yearly" else timedelta(days=30)
    end_dt = (_from_timestamp(end_ts) or (start_dt + delta)) if end_ts else (start_dt + delta)

    return start_dt, end_dt


class ProcessWebhookEvent:
    def __init__(
        self,
        subscription_repository: SubscriptionRepository,
        quota_service: Any | None = None,
        settings: Any | None = None,
    ) -> None:
        self._repository = subscription_repository
        self._quota_service = quota_service
        self._settings = settings

    async def _invalidate_cache(self, org_id: UUID) -> None:
        if self._quota_service and hasattr(
            self._quota_service, "invalidate_organization_quota_cache"
        ):
            await self._quota_service.invalidate_organization_quota_cache(org_id)

    async def execute(
        self,
        *,
        event: dict[str, Any],
        provider: str = "stripe",
    ) -> dict[str, Any]:
        if (
            provider == "mock"
            and self._settings
            and hasattr(self._settings, "is_development")
            and not self._settings.is_development
        ):
            raise WebhookVerificationError(
                "Mock webhook events are rejected in production environment"
            )

        event_id = event.get("id")
        event_type = event.get("type", "")
        if not event_id or not event_type:
            raise WebhookVerificationError("Malformed webhook event: missing 'id' or 'type'")

        if await self._repository.is_event_processed(provider, event_id):
            return {
                "status": "already_processed",
                "event_id": event_id,
                "event_type": event_type,
            }

        data_object = event.get("data", {}).get("object", {})

        if event_type == "checkout.session.completed":
            return await self._handle_checkout_completed(
                event=event,
                event_id=event_id,
                event_type=event_type,
                data=data_object,
                provider=provider,
            )

        if event_type in (
            "customer.subscription.updated",
            "customer.subscription.created",
            "invoice.payment_succeeded",
        ):
            return await self._handle_subscription_updated(
                event=event,
                event_id=event_id,
                event_type=event_type,
                data=data_object,
                provider=provider,
            )

        if event_type == "customer.subscription.deleted":
            return await self._handle_subscription_deleted(
                event=event,
                event_id=event_id,
                event_type=event_type,
                data=data_object,
                provider=provider,
            )

        # Non-critical / informational events
        await self._repository.record_event(
            organization_id=None,
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=event,
            status="ignored",
        )
        return {
            "status": "ignored",
            "event_id": event_id,
            "event_type": event_type,
        }

    async def _handle_checkout_completed(
        self,
        *,
        event: dict[str, Any],
        event_id: str,
        event_type: str,
        data: dict[str, Any],
        provider: str,
    ) -> dict[str, Any]:
        metadata = data.get("metadata") or {}
        org_id_str = metadata.get("organization_id") or data.get("client_reference_id")

        if not org_id_str:
            await self._repository.record_event(
                organization_id=None,
                provider=provider,
                event_id=event_id,
                event_type=event_type,
                payload=event,
                status="ignored",
                error_message="Missing organization_id in checkout metadata",
            )
            return {"status": "ignored", "reason": "missing_organization_id"}

        org_id = UUID(org_id_str)
        plan_tier = metadata.get("plan_tier", "pro_100gb")
        billing_interval = metadata.get("billing_interval", "monthly")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        storage_quota_bytes = PLAN_QUOTAS_MAP.get(plan_tier, PRO_100GB_STORAGE_QUOTA_BYTES)
        max_members = PLAN_MAX_MEMBERS_MAP.get(plan_tier, None)

        period_start, period_end = _extract_period_dates(data, billing_interval)

        # If Stripe subscription ID is present, try to retrieve exact dates from Stripe
        if provider == "stripe" and subscription_id:
            try:
                import stripe

                sub_obj = await asyncio.to_thread(
                    stripe.Subscription.retrieve, str(subscription_id)
                )
                if sub_obj:
                    sub_any = cast(Any, sub_obj)
                    sub_dict: dict[str, Any] = (
                        sub_any.to_dict()
                        if hasattr(sub_any, "to_dict")
                        else dict(sub_any)
                    )
                    s_start, s_end = _extract_period_dates(sub_dict, billing_interval)
                    if s_end:
                        period_start, period_end = s_start, s_end
            except Exception:
                pass

        await self._repository.upsert_subscription(
            organization_id=org_id,
            provider=provider,
            provider_customer_id=str(customer_id) if customer_id else None,
            provider_subscription_id=str(subscription_id) if subscription_id else None,
            provider_price_id=None,
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            storage_quota_bytes=storage_quota_bytes,
            max_members=max_members,
            status="active",
            current_period_start=period_start,
            current_period_end=period_end,
        )

        await self._repository.update_organization_plan(
            organization_id=org_id,
            plan_tier=plan_tier,
            storage_quota_bytes=storage_quota_bytes,
        )

        await self._invalidate_cache(org_id)

        await self._repository.record_event(
            organization_id=org_id,
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=event,
            status="processed",
        )

        return {
            "status": "processed",
            "event_id": event_id,
            "organization_id": str(org_id),
            "action": "subscription_activated",
            "plan_tier": plan_tier,
        }

    async def _handle_subscription_updated(
        self,
        *,
        event: dict[str, Any],
        event_id: str,
        event_type: str,
        data: dict[str, Any],
        provider: str,
    ) -> dict[str, Any]:
        sub_id = (
            data.get("subscription")
            if event_type.startswith("invoice.")
            else (data.get("id") or data.get("subscription"))
        )
        sub = (
            await self._repository.get_by_provider_subscription_id(str(sub_id))
            if sub_id
            else None
        )

        metadata = data.get("metadata") or {}
        org_id_str = metadata.get("organization_id")
        if not sub and org_id_str:
            sub = await self._repository.get_by_organization_id(UUID(org_id_str))

        if not sub:
            await self._repository.record_event(
                organization_id=None,
                provider=provider,
                event_id=event_id,
                event_type=event_type,
                payload=event,
                status="ignored",
                error_message="Subscription not found in database",
            )
            return {"status": "ignored", "reason": "subscription_not_found"}

        org_id = sub.organization_id
        plan_tier = metadata.get("plan_tier") or sub.plan_tier
        billing_interval = metadata.get("billing_interval") or sub.billing_interval
        status = data.get("status", sub.status)
        cancel_at_period_end = data.get("cancel_at_period_end", sub.cancel_at_period_end)

        extracted_start, extracted_end = _extract_period_dates(data, billing_interval)
        period_start = extracted_start or sub.current_period_start
        period_end = extracted_end or sub.current_period_end
        canceled_at = _from_timestamp(data.get("canceled_at")) or sub.canceled_at

        is_downgraded_to_free = status in ("canceled", "unpaid", "incomplete_expired")
        effective_plan = "free" if is_downgraded_to_free else plan_tier
        storage_quota_bytes = (
            DEFAULT_FREE_STORAGE_QUOTA_BYTES
            if is_downgraded_to_free
            else PLAN_QUOTAS_MAP.get(plan_tier, sub.storage_quota_bytes)
        )
        max_members = PLAN_MAX_MEMBERS_MAP.get(effective_plan, None)

        await self._repository.upsert_subscription(
            organization_id=org_id,
            provider=provider,
            provider_customer_id=sub.provider_customer_id,
            provider_subscription_id=str(sub_id) if sub_id else sub.provider_subscription_id,
            provider_price_id=sub.provider_price_id,
            plan_tier=effective_plan,
            billing_interval=billing_interval,
            storage_quota_bytes=storage_quota_bytes,
            max_members=max_members,
            status=status,
            current_period_start=period_start,
            current_period_end=period_end,
            cancel_at_period_end=cancel_at_period_end,
            canceled_at=canceled_at,
        )

        await self._repository.update_organization_plan(
            organization_id=org_id,
            plan_tier=effective_plan,
            storage_quota_bytes=storage_quota_bytes,
        )

        await self._invalidate_cache(org_id)

        await self._repository.record_event(
            organization_id=org_id,
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=event,
            status="processed",
        )

        return {
            "status": "processed",
            "event_id": event_id,
            "organization_id": str(org_id),
            "action": "subscription_updated",
            "plan_tier": effective_plan,
            "sub_status": status,
        }

    async def _handle_subscription_deleted(
        self,
        *,
        event: dict[str, Any],
        event_id: str,
        event_type: str,
        data: dict[str, Any],
        provider: str,
    ) -> dict[str, Any]:
        sub_id = data.get("id")
        sub = (
            await self._repository.get_by_provider_subscription_id(str(sub_id))
            if sub_id
            else None
        )

        if not sub:
            metadata = data.get("metadata") or {}
            org_id_str = metadata.get("organization_id")
            if org_id_str:
                sub = await self._repository.get_by_organization_id(UUID(org_id_str))

        if not sub:
            await self._repository.record_event(
                organization_id=None,
                provider=provider,
                event_id=event_id,
                event_type=event_type,
                payload=event,
                status="ignored",
                error_message="Deleted subscription not found in database",
            )
            return {"status": "ignored", "reason": "subscription_not_found"}

        org_id = sub.organization_id
        await self._repository.upsert_subscription(
            organization_id=org_id,
            provider=provider,
            provider_customer_id=sub.provider_customer_id,
            provider_subscription_id=sub.provider_subscription_id,
            provider_price_id=sub.provider_price_id,
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
            organization_id=org_id,
            plan_tier="free",
            storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES,
        )

        await self._invalidate_cache(org_id)

        await self._repository.record_event(
            organization_id=org_id,
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=event,
            status="processed",
        )

        return {
            "status": "processed",
            "event_id": event_id,
            "organization_id": str(org_id),
            "action": "subscription_canceled",
            "plan_tier": "free",
        }
