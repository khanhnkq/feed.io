from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class SubscriptionRecord:
    id: UUID
    organization_id: UUID
    provider: str
    provider_customer_id: str | None
    provider_subscription_id: str | None
    provider_price_id: str | None
    plan_tier: str
    billing_interval: str
    storage_quota_bytes: int
    max_members: int | None
    status: str
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    canceled_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class BillingOverview:
    organization_id: UUID
    plan_tier: str
    billing_interval: str | None
    status: str
    storage_used_bytes: int
    storage_quota_bytes: int
    storage_usage_percentage: float
    active_members_count: int
    max_members: int | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    has_payment_method: bool
    payments_enabled: bool = True
