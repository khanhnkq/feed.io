from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BillingOverviewResponse(BaseModel):
    organization_id: UUID
    plan_tier: str
    billing_interval: str | None = None
    status: str
    storage_used_bytes: int
    storage_quota_bytes: int
    storage_usage_percentage: float
    active_members_count: int
    max_members: int | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    has_payment_method: bool = False
    payments_enabled: bool = True


class PlatformSettingsResponse(BaseModel):
    payments_enabled: bool
    billing_provider: str


class UpdatePlatformSettingsRequest(BaseModel):
    payments_enabled: bool


class CreateCheckoutSessionRequest(BaseModel):
    plan_tier: str = Field(description="Target plan tier, e.g. pro_100gb, pro_500gb, pro_1tb")
    billing_interval: str = Field(
        default="monthly", description="Billing interval: monthly or yearly"
    )
    success_url: str = Field(description="URL to redirect user on successful checkout")
    cancel_url: str = Field(description="URL to redirect user on cancelled checkout")


class CreateCheckoutSessionResponse(BaseModel):
    checkout_url: str


class CreatePortalSessionRequest(BaseModel):
    return_url: str = Field(description="URL to redirect user after leaving Customer Portal")


class CreatePortalSessionResponse(BaseModel):
    portal_url: str


class MockWebhookTriggerRequest(BaseModel):
    event_type: str = Field(default="checkout.session.completed")
    organization_id: UUID
    plan_tier: str = Field(default="pro_100gb")
    billing_interval: str = Field(default="monthly")


class CancelSubscriptionRequest(BaseModel):
    immediate: bool = Field(
        default=False,
        description=(
            "If true, cancels immediately and downgrades to Free. "
            "If false, cancels at period end."
        ),
    )


class RenewSubscriptionRequest(BaseModel):
    billing_interval: str | None = Field(
        default=None, description="Billing interval: monthly or yearly"
    )
    success_url: str = Field(description="URL to redirect user on successful checkout")
    cancel_url: str = Field(description="URL to redirect user on cancelled checkout")


class RenewSubscriptionResponse(BaseModel):
    status: str
    checkout_url: str | None = None
    plan_tier: str | None = None
    current_period_end: datetime | None = None
