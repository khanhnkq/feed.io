from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.domain.entities import SubscriptionRecord
from feedio.modules.billing.infrastructure.models import SubscriptionEventTable, SubscriptionTable
from feedio.modules.organizations.infrastructure.models import OrganizationTable
from feedio.shared.infrastructure.persistence import utc_now


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


class SqlSubscriptionRepository(SubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, record: SubscriptionTable) -> SubscriptionRecord:
        return SubscriptionRecord(
            id=record.id,
            organization_id=record.organization_id,
            provider=record.provider,
            provider_customer_id=record.provider_customer_id,
            provider_subscription_id=record.provider_subscription_id,
            provider_price_id=record.provider_price_id,
            plan_tier=record.plan_tier,
            billing_interval=record.billing_interval,
            storage_quota_bytes=record.storage_quota_bytes,
            max_members=record.max_members,
            status=record.status,
            current_period_start=record.current_period_start,
            current_period_end=record.current_period_end,
            cancel_at_period_end=record.cancel_at_period_end,
            canceled_at=record.canceled_at,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    async def get_by_organization_id(self, organization_id: UUID) -> SubscriptionRecord | None:
        statement = select(SubscriptionTable).where(
            col(SubscriptionTable.organization_id) == organization_id
        )
        result = await self._session.execute(statement)
        record = result.scalar_one_or_none()
        return self._to_domain(record) if record else None

    async def get_by_provider_subscription_id(
        self, subscription_id: str
    ) -> SubscriptionRecord | None:
        statement = select(SubscriptionTable).where(
            col(SubscriptionTable.provider_subscription_id) == subscription_id
        )
        result = await self._session.execute(statement)
        record = result.scalar_one_or_none()
        return self._to_domain(record) if record else None

    async def get_by_provider_customer_id(self, customer_id: str) -> SubscriptionRecord | None:
        statement = select(SubscriptionTable).where(
            col(SubscriptionTable.provider_customer_id) == customer_id
        )
        result = await self._session.execute(statement)
        record = result.scalar_one_or_none()
        return self._to_domain(record) if record else None

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
    ) -> SubscriptionRecord:
        statement = select(SubscriptionTable).where(
            col(SubscriptionTable.organization_id) == organization_id
        )
        result = await self._session.execute(statement)
        record = result.scalar_one_or_none()

        if record is None:
            record = SubscriptionTable(
                organization_id=organization_id,
                provider=provider,
                provider_customer_id=provider_customer_id,
                provider_subscription_id=provider_subscription_id,
                provider_price_id=provider_price_id,
                plan_tier=plan_tier,
                billing_interval=billing_interval,
                storage_quota_bytes=storage_quota_bytes,
                max_members=max_members,
                status=status,
                current_period_start=current_period_start,
                current_period_end=current_period_end,
                cancel_at_period_end=cancel_at_period_end,
                canceled_at=canceled_at,
            )
            self._session.add(record)
        else:
            record.provider = provider
            if provider_customer_id is not None:
                record.provider_customer_id = provider_customer_id
            if provider_subscription_id is not None:
                record.provider_subscription_id = provider_subscription_id
            if provider_price_id is not None:
                record.provider_price_id = provider_price_id
            record.plan_tier = plan_tier
            record.billing_interval = billing_interval
            record.storage_quota_bytes = storage_quota_bytes
            record.max_members = max_members
            record.status = status
            record.current_period_start = current_period_start
            record.current_period_end = current_period_end
            record.cancel_at_period_end = cancel_at_period_end
            record.canceled_at = canceled_at
            record.updated_at = utc_now()

        await self._session.commit()
        await self._session.refresh(record)
        return self._to_domain(record)

    async def is_event_processed(self, provider: str, event_id: str) -> bool:
        statement = select(SubscriptionEventTable).where(
            col(SubscriptionEventTable.provider) == provider,
            col(SubscriptionEventTable.event_id) == event_id,
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none() is not None

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
    ) -> None:
        safe_payload = _to_json_safe(payload)
        event = SubscriptionEventTable(
            organization_id=organization_id,
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=safe_payload,
            status=status,
            error_message=error_message,
        )
        self._session.add(event)
        await self._session.commit()

    async def update_organization_plan(
        self,
        organization_id: UUID,
        plan_tier: str,
        storage_quota_bytes: int,
    ) -> None:
        statement = select(OrganizationTable).where(
            col(OrganizationTable.id) == organization_id,
            col(OrganizationTable.deleted_at).is_(None),
        )
        result = await self._session.execute(statement)
        org = result.scalar_one_or_none()
        if org:
            org.plan_tier = plan_tier
            org.storage_quota_bytes = storage_quota_bytes
            org.updated_at = utc_now()
            await self._session.commit()
