"""Unit tests for subscription models, constraints, and domain constants."""

from uuid import uuid4

from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    FREE_TIER_MAX_MEMBERS,
    PLAN_MAX_MEMBERS_MAP,
    PLAN_QUOTAS_MAP,
    PRO_1TB_STORAGE_QUOTA_BYTES,
    PRO_100GB_STORAGE_QUOTA_BYTES,
    PRO_500GB_STORAGE_QUOTA_BYTES,
    VALID_BILLING_INTERVALS,
    VALID_PLAN_TIERS,
    VALID_SUBSCRIPTION_STATUSES,
)
from feedio.modules.billing.infrastructure.models import (
    SubscriptionEventTable,
    SubscriptionTable,
)


def test_billing_domain_constants() -> None:
    assert DEFAULT_FREE_STORAGE_QUOTA_BYTES == 5 * 1024 * 1024 * 1024
    assert PRO_100GB_STORAGE_QUOTA_BYTES == 100 * 1024 * 1024 * 1024
    assert PRO_500GB_STORAGE_QUOTA_BYTES == 500 * 1024 * 1024 * 1024
    assert PRO_1TB_STORAGE_QUOTA_BYTES == 1024 * 1024 * 1024 * 1024

    assert FREE_TIER_MAX_MEMBERS == 5
    assert PLAN_MAX_MEMBERS_MAP["free"] == 5
    assert PLAN_MAX_MEMBERS_MAP["pro_100gb"] is None
    assert PLAN_MAX_MEMBERS_MAP["pro_500gb"] is None
    assert PLAN_MAX_MEMBERS_MAP["pro_1tb"] is None

    assert "free" in VALID_PLAN_TIERS
    assert "pro_100gb" in VALID_PLAN_TIERS
    assert "monthly" in VALID_BILLING_INTERVALS
    assert "yearly" in VALID_BILLING_INTERVALS
    assert "active" in VALID_SUBSCRIPTION_STATUSES


def test_subscription_table_default_values() -> None:
    org_id = uuid4()
    sub = SubscriptionTable(organization_id=org_id)

    assert sub.organization_id == org_id
    assert sub.provider == "stripe"
    assert sub.plan_tier == "free"
    assert sub.billing_interval == "monthly"
    assert sub.storage_quota_bytes == 5 * 1024 * 1024 * 1024
    assert sub.max_members == 5
    assert sub.status == "active"
    assert sub.cancel_at_period_end is False
    assert sub.id is not None
    assert sub.created_at is not None


def test_subscription_event_table_defaults() -> None:
    event = SubscriptionEventTable(
        event_id="evt_test_12345",
        event_type="checkout.session.completed",
        payload={"customer": "cus_123"},
    )

    assert event.event_id == "evt_test_12345"
    assert event.event_type == "checkout.session.completed"
    assert event.provider == "stripe"
    assert event.status == "processed"
    assert event.payload["customer"] == "cus_123"
    assert event.id is not None
