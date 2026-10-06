"""Unit tests for Phase 3 Billing and Webhook infrastructure."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from feedio.bootstrap.config import Settings
from feedio.modules.billing.application.create_checkout_session import CreateCheckoutSession
from feedio.modules.billing.application.create_portal_session import CreatePortalSession
from feedio.modules.billing.application.get_organization_billing import GetOrganizationBilling
from feedio.modules.billing.application.ports import SubscriptionRepository
from feedio.modules.billing.application.process_webhook_event import ProcessWebhookEvent
from feedio.modules.billing.domain.constants import (
    DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    PRO_1TB_STORAGE_QUOTA_BYTES,
    PRO_100GB_STORAGE_QUOTA_BYTES,
    PRO_500GB_STORAGE_QUOTA_BYTES,
)
from feedio.modules.billing.domain.entities import SubscriptionRecord
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    InvalidBillingIntervalError,
    InvalidPlanTierError,
    PaymentGatewayError,
    SubscriptionNotFoundError,
    WebhookVerificationError,
)
from feedio.modules.billing.infrastructure.adapters.mock_adapter import MockPaymentAdapter
from feedio.modules.billing.infrastructure.adapters.stripe_adapter import StripePaymentAdapter
from feedio.modules.billing.presentation.billing_router import create_billing_router
from feedio.modules.billing.presentation.webhook_router import create_webhook_router
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole


class InMemorySubscriptionRepository(SubscriptionRepository):
    def __init__(self) -> None:
        self.subscriptions: dict[UUID, SubscriptionRecord] = {}
        self.events: set[tuple[str, str]] = set()
        self.recorded_events: list[dict[str, Any]] = []
        self.organization_plans: dict[UUID, tuple[str, int]] = {}

    async def get_by_organization_id(self, organization_id: UUID) -> SubscriptionRecord | None:
        return self.subscriptions.get(organization_id)

    async def get_by_provider_subscription_id(
        self, subscription_id: str
    ) -> SubscriptionRecord | None:
        for sub in self.subscriptions.values():
            if sub.provider_subscription_id == subscription_id:
                return sub
        return None

    async def get_by_provider_customer_id(self, customer_id: str) -> SubscriptionRecord | None:
        for sub in self.subscriptions.values():
            if sub.provider_customer_id == customer_id:
                return sub
        return None

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
        existing = self.subscriptions.get(organization_id)
        sub_id = existing.id if existing else uuid4()
        record = SubscriptionRecord(
            id=sub_id,
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
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.subscriptions[organization_id] = record
        return record

    async def is_event_processed(self, provider: str, event_id: str) -> bool:
        return (provider, event_id) in self.events

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
        self.events.add((provider, event_id))
        self.recorded_events.append(
            {
                "organization_id": organization_id,
                "provider": provider,
                "event_id": event_id,
                "event_type": event_type,
                "payload": payload,
                "status": status,
                "error_message": error_message,
            }
        )

    async def update_organization_plan(
        self, organization_id: UUID, plan_tier: str, storage_quota_bytes: int
    ) -> None:
        self.organization_plans[organization_id] = (plan_tier, storage_quota_bytes)

    async def list_active_non_free_subscriptions(self) -> list[SubscriptionRecord]:
        return [sub for sub in self.subscriptions.values() if sub.plan_tier != "free"]


class FakeQuotaService:
    def __init__(self) -> None:
        self.invalidated_orgs: list[UUID] = []

    async def invalidate_organization_quota_cache(self, organization_id: UUID) -> None:
        self.invalidated_orgs.append(organization_id)


class FakeOrgRepo:
    def __init__(self, plan_tier: str = "free", storage_quota_bytes: int = 5368709120) -> None:
        self.plan_tier = plan_tier
        self.storage_quota_bytes = storage_quota_bytes

    async def get_by_id(self, org_id: UUID, user_id: UUID) -> Any:
        class FakeOrg:
            id = org_id
            name = "Test Studio"
            plan_tier = self.plan_tier
            storage_quota_bytes = self.storage_quota_bytes

        return FakeOrg()

    async def count_total_members_and_pending(self, org_id: UUID) -> int:
        return 3


class FakeMediaRepo:
    def __init__(self, usage_bytes: int = 1_073_741_824) -> None:
        self.usage_bytes = usage_bytes

    async def get_organization_storage_usage_bytes(self, org_id: UUID) -> int:
        return self.usage_bytes


# --- Test 1: MockPaymentAdapter ---
@pytest.mark.asyncio
async def test_mock_payment_adapter() -> None:
    adapter = MockPaymentAdapter()
    org_id = uuid4()

    checkout_url = await adapter.create_checkout_session(
        organization_id=org_id,
        organization_slug="studio-alpha",
        user_email="producer@alpha.com",
        plan_tier="pro_100gb",
        billing_interval="monthly",
        success_url="http://localhost:3000/app/settings/billing?status=success",
        cancel_url="http://localhost:3000/app/settings/billing?status=cancelled",
    )
    assert "session_id=mock_cs_" in checkout_url
    assert "plan=pro_100gb" in checkout_url
    assert "interval=monthly" in checkout_url
    assert "org_id=" in checkout_url

    portal_url = await adapter.create_customer_portal_session(
        customer_id="cus_mock_123",
        return_url="http://localhost:3000/app/settings/billing",
    )
    assert "portal_session=mock_portal_" in portal_url
    assert "customer=cus_mock_123" in portal_url

    # Webhook parsing
    valid_payload = b'{"id": "evt_123", "type": "checkout.session.completed"}'
    parsed = adapter.construct_webhook_event(payload=valid_payload, signature_header="any_sig")
    assert parsed["id"] == "evt_123"

    with pytest.raises(WebhookVerificationError):
        adapter.construct_webhook_event(payload=valid_payload, signature_header="invalid_sig")

    with pytest.raises(WebhookVerificationError):
        adapter.construct_webhook_event(payload=b"invalid json", signature_header="sig")


# --- Test 2: StripePaymentAdapter unconfigured ---
@pytest.mark.asyncio
async def test_stripe_payment_adapter_unconfigured() -> None:
    settings = Settings(stripe_secret_key=None, stripe_webhook_secret=None)
    adapter = StripePaymentAdapter(settings)

    with pytest.raises(PaymentGatewayError, match="Stripe secret key is not configured"):
        await adapter.create_checkout_session(
            organization_id=uuid4(),
            organization_slug="org",
            user_email="a@b.com",
            plan_tier="pro_100gb",
            billing_interval="monthly",
            success_url="http://success",
            cancel_url="http://cancel",
        )

    with pytest.raises(PaymentGatewayError, match="Stripe secret key is not configured"):
        await adapter.create_customer_portal_session(
            customer_id="cus_123",
            return_url="http://return",
        )

    with pytest.raises(WebhookVerificationError, match="webhook secret is not configured"):
        adapter.construct_webhook_event(payload=b"{}", signature_header="sig")


# --- Test 3: CreateCheckoutSession Use Case ---
@pytest.mark.asyncio
async def test_create_checkout_session_permissions_and_validation() -> None:
    adapter = MockPaymentAdapter()
    use_case = CreateCheckoutSession(adapter)
    org_id = uuid4()
    user_id = uuid4()

    # Member role forbidden
    member_context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.MEMBER,
    )
    with pytest.raises(InsufficientBillingPermissionError):
        await use_case.execute(
            context=member_context,
            organization_slug="test-org",
            user_email="user@test.com",
            plan_tier="pro_100gb",
            billing_interval="monthly",
            success_url="http://success",
            cancel_url="http://cancel",
        )

    owner_context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    # Invalid plan tier
    with pytest.raises(InvalidPlanTierError):
        await use_case.execute(
            context=owner_context,
            organization_slug="test-org",
            user_email="user@test.com",
            plan_tier="free",
            billing_interval="monthly",
            success_url="http://success",
            cancel_url="http://cancel",
        )

    with pytest.raises(InvalidPlanTierError):
        await use_case.execute(
            context=owner_context,
            organization_slug="test-org",
            user_email="user@test.com",
            plan_tier="pro_999gb",
            billing_interval="monthly",
            success_url="http://success",
            cancel_url="http://cancel",
        )

    # Invalid interval
    with pytest.raises(InvalidBillingIntervalError):
        await use_case.execute(
            context=owner_context,
            organization_slug="test-org",
            user_email="user@test.com",
            plan_tier="pro_100gb",
            billing_interval="weekly",
            success_url="http://success",
            cancel_url="http://cancel",
        )

    # Valid execution
    url = await use_case.execute(
        context=owner_context,
        organization_slug="test-org",
        user_email="user@test.com",
        plan_tier="pro_500gb",
        billing_interval="yearly",
        success_url="http://success",
        cancel_url="http://cancel",
    )
    assert "plan=pro_500gb" in url
    assert "interval=yearly" in url


# --- Test 4: CreatePortalSession Use Case ---
@pytest.mark.asyncio
async def test_create_portal_session() -> None:
    adapter = MockPaymentAdapter()
    repo = InMemorySubscriptionRepository()
    use_case = CreatePortalSession(adapter, repo)
    org_id = uuid4()
    user_id = uuid4()

    owner_context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    # Subscription not found initially
    with pytest.raises(SubscriptionNotFoundError):
        await use_case.execute(context=owner_context, return_url="http://return")

    # Add active subscription
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="stripe",
        provider_customer_id="cus_stripe_real_123",
        provider_subscription_id="sub_stripe_real_123",
        provider_price_id="price_100gb",
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=None,
    )

    portal_url = await use_case.execute(context=owner_context, return_url="http://return")
    assert "customer=cus_stripe_real_123" in portal_url


# --- Test 5: ProcessWebhookEvent Checkout Completed & Idempotency ---
@pytest.mark.asyncio
async def test_process_webhook_checkout_completed_and_idempotency() -> None:
    repo = InMemorySubscriptionRepository()
    quota_service = FakeQuotaService()
    processor = ProcessWebhookEvent(repo, quota_service=quota_service)

    org_id = uuid4()
    event_payload = {
        "id": "evt_checkout_success_999",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "customer": "cus_999",
                "subscription": "sub_999",
                "metadata": {
                    "organization_id": str(org_id),
                    "plan_tier": "pro_500gb",
                    "billing_interval": "monthly",
                },
            }
        },
    }

    result = await processor.execute(event=event_payload, provider="stripe")
    assert result["status"] == "processed"
    assert result["plan_tier"] == "pro_500gb"

    # Verify subscription state
    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.plan_tier == "pro_500gb"
    assert sub.storage_quota_bytes == PRO_500GB_STORAGE_QUOTA_BYTES
    assert sub.max_members is None
    assert sub.status == "active"

    # Verify organization table plan was updated
    assert org_id in repo.organization_plans
    tier, quota = repo.organization_plans[org_id]
    assert tier == "pro_500gb"
    assert quota == PRO_500GB_STORAGE_QUOTA_BYTES

    # Verify Valkey cache invalidation was triggered
    assert org_id in quota_service.invalidated_orgs

    # Idempotency check: replay the exact same event
    replay_result = await processor.execute(event=event_payload, provider="stripe")
    assert replay_result["status"] == "already_processed"


# --- Test 6: ProcessWebhookEvent Subscription Updated and Deleted ---
@pytest.mark.asyncio
async def test_process_webhook_subscription_lifecycle() -> None:
    repo = InMemorySubscriptionRepository()
    quota_service = FakeQuotaService()
    processor = ProcessWebhookEvent(repo, quota_service=quota_service)

    org_id = uuid4()
    sub_id = "sub_live_777"

    # Seed subscription
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="stripe",
        provider_customer_id="cus_777",
        provider_subscription_id=sub_id,
        provider_price_id="price_old",
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=None,
    )

    # 1. Upgrade to 1TB via subscription.updated
    update_event = {
        "id": "evt_sub_upgrade_111",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": sub_id,
                "status": "active",
                "metadata": {
                    "organization_id": str(org_id),
                    "plan_tier": "pro_1tb",
                    "billing_interval": "yearly",
                },
            }
        },
    }
    update_res = await processor.execute(event=update_event, provider="stripe")
    assert update_res["status"] == "processed"
    assert update_res["plan_tier"] == "pro_1tb"

    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.plan_tier == "pro_1tb"
    assert sub.storage_quota_bytes == PRO_1TB_STORAGE_QUOTA_BYTES

    # 2. Cancel subscription via subscription.deleted
    delete_event = {
        "id": "evt_sub_deleted_222",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": sub_id,
            }
        },
    }
    delete_res = await processor.execute(event=delete_event, provider="stripe")
    assert delete_res["status"] == "processed"
    assert delete_res["action"] == "subscription_canceled"

    sub_after_cancel = await repo.get_by_organization_id(org_id)
    assert sub_after_cancel is not None
    assert sub_after_cancel.status == "canceled"
    assert sub_after_cancel.plan_tier == "free"
    assert sub_after_cancel.storage_quota_bytes == DEFAULT_FREE_STORAGE_QUOTA_BYTES
    assert sub_after_cancel.max_members == 5


# --- Test 7: GetOrganizationBilling Use Case ---
@pytest.mark.asyncio
async def test_get_organization_billing() -> None:
    sub_repo = InMemorySubscriptionRepository()
    org_id = uuid4()
    user_id = uuid4()

    org_repo = FakeOrgRepo(plan_tier="pro_100gb", storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES)
    media_repo = FakeMediaRepo(usage_bytes=10 * 1024 * 1024 * 1024)  # 10 GB used

    await sub_repo.upsert_subscription(
        organization_id=org_id,
        provider="stripe",
        provider_customer_id="cus_active",
        provider_subscription_id="sub_active",
        provider_price_id="price_100gb",
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=None,
    )

    get_billing = GetOrganizationBilling(sub_repo, org_repo, media_repo)
    context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    overview = await get_billing.execute(context=context)
    assert overview.organization_id == org_id
    assert overview.plan_tier == "pro_100gb"
    assert overview.storage_quota_bytes == PRO_100GB_STORAGE_QUOTA_BYTES
    assert overview.storage_used_bytes == 10 * 1024 * 1024 * 1024
    assert overview.storage_usage_percentage == 10.0  # 10GB / 100GB = 10.0%
    assert overview.active_members_count == 3
    assert overview.max_members is None
    assert overview.has_payment_method is True


# --- Test 8: End-to-End FastAPI Routers ---
def test_billing_and_webhook_api_endpoints() -> None:
    app = FastAPI()
    sub_repo = InMemorySubscriptionRepository()
    gateway = MockPaymentAdapter()
    org_id = uuid4()
    user_id = uuid4()

    org_repo = FakeOrgRepo(plan_tier="free", storage_quota_bytes=DEFAULT_FREE_STORAGE_QUOTA_BYTES)
    media_repo = FakeMediaRepo(usage_bytes=1024 * 1024 * 1024)  # 1 GB used

    get_billing = GetOrganizationBilling(sub_repo, org_repo, media_repo)
    checkout_uc = CreateCheckoutSession(gateway)
    portal_uc = CreatePortalSession(gateway, sub_repo)
    process_webhook = ProcessWebhookEvent(sub_repo)

    mock_user = CurrentUser(
        id=user_id,
        email="owner@feedi.tv",
        email_verified=True,
    )
    mock_context = OrganizationContext(
        organization_id=org_id,
        user_id=user_id,
        role=OrganizationRole.OWNER,
    )

    billing_router = create_billing_router(
        get_billing_provider=lambda: get_billing,
        create_checkout_provider=lambda: checkout_uc,
        create_portal_provider=lambda: portal_uc,
        organization_context_provider=lambda: mock_context,
        current_user_provider=lambda: mock_user,
    )
    webhook_router = create_webhook_router(
        payment_gateway_provider=lambda: gateway,
        process_webhook_provider=lambda: process_webhook,
    )

    app.include_router(billing_router, prefix="/api/v1")
    app.include_router(webhook_router, prefix="/api/v1")

    client = TestClient(app)

    # 1. GET /billing
    resp = client.get(f"/api/v1/organizations/{org_id}/billing")
    assert resp.status_code == 200
    data = resp.json()
    assert data["organization_id"] == str(org_id)
    assert data["plan_tier"] == "free"
    assert data["storage_quota_bytes"] == DEFAULT_FREE_STORAGE_QUOTA_BYTES
    assert data["max_members"] == 5
    assert data["active_members_count"] == 3

    # 2. POST /billing/checkout
    checkout_resp = client.post(
        f"/api/v1/organizations/{org_id}/billing/checkout",
        json={
            "plan_tier": "pro_100gb",
            "billing_interval": "monthly",
            "success_url": "http://feedi.tv/billing/success",
            "cancel_url": "http://feedi.tv/billing/cancel",
        },
    )
    assert checkout_resp.status_code == 200
    assert "checkout_url" in checkout_resp.json()
    assert "session_id=" in checkout_resp.json()["checkout_url"]

    # 3. POST /billing/checkout invalid plan
    bad_plan_resp = client.post(
        f"/api/v1/organizations/{org_id}/billing/checkout",
        json={
            "plan_tier": "free",
            "billing_interval": "monthly",
            "success_url": "http://feedi.tv/billing/success",
            "cancel_url": "http://feedi.tv/billing/cancel",
        },
    )
    assert bad_plan_resp.status_code == 400

    # 4. POST /webhooks/mock trigger
    mock_webhook_resp = client.post(
        "/api/v1/webhooks/mock",
        json={
            "event_type": "checkout.session.completed",
            "organization_id": str(org_id),
            "plan_tier": "pro_500gb",
            "billing_interval": "yearly",
        },
    )
    assert mock_webhook_resp.status_code == 200
    assert mock_webhook_resp.json()["received"] is True
    assert mock_webhook_resp.json()["result"]["status"] == "processed"

    # 5. POST /webhooks/stripe with invalid signature
    stripe_webhook_resp = client.post(
        "/api/v1/webhooks/stripe",
        content=b'{"id": "evt_test", "type": "checkout.session.completed"}',
        headers={"stripe-signature": "invalid_sig"},
    )
    assert stripe_webhook_resp.status_code == 400


@pytest.mark.asyncio
async def test_platform_settings_and_payment_toggle() -> None:
    """Verify that super_admin can toggle payments_enabled and checkout is blocked when disabled."""
    from feedio.modules.billing.infrastructure.platform_settings import PlatformBillingSettings

    platform_settings = PlatformBillingSettings(valkey_url=None, default_enabled=True)
    assert await platform_settings.is_payments_enabled() is True

    # Toggle to False
    await platform_settings.set_payments_enabled(False)
    assert await platform_settings.is_payments_enabled() is False

    # Create checkout use case with platform_settings disabled
    gateway = MockPaymentAdapter()
    checkout = CreateCheckoutSession(gateway, platform_settings=platform_settings)
    context = OrganizationContext(
        organization_id=uuid4(),
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    with pytest.raises(PaymentGatewayError) as exc:
        await checkout.execute(
            context=context,
            organization_slug="test-slug",
            user_email="test@feedi.tv",
            plan_tier="pro_100gb",
            billing_interval="monthly",
            success_url="http://test/success",
            cancel_url="http://test/cancel",
        )
    assert "disabled" in str(exc.value).lower()

    # Re-enable
    await platform_settings.set_payments_enabled(True)
    assert await platform_settings.is_payments_enabled() is True


@pytest.mark.asyncio
async def test_reconcile_subscriptions_missing_period_end() -> None:
    """Verify that subscriptions with missing current_period_end are backfilled."""
    from feedio.modules.billing.application.reconcile_subscriptions import ReconcileSubscriptions

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    quota_svc = FakeQuotaService()

    org_id = uuid4()
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_test",
        provider_subscription_id="sub_test",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=None,  # Missing!
    )

    reconciler = ReconcileSubscriptions(
        subscription_repository=repo,
        settings=settings,
        quota_service=quota_svc,
    )
    result = await reconciler.execute()

    assert result["total_checked"] == 1
    assert result["reconciled_dates"] == 1
    assert result["downgraded"] == 0

    updated = await repo.get_by_organization_id(org_id)
    assert updated is not None
    assert updated.current_period_end is not None
    assert updated.current_period_end > datetime.now(UTC)


@pytest.mark.asyncio
async def test_reconcile_subscriptions_downgrades_expired() -> None:
    """Verify that expired subscriptions are downgraded to free tier (5 GB)."""
    from datetime import timedelta

    from feedio.modules.billing.application.reconcile_subscriptions import ReconcileSubscriptions

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    quota_svc = FakeQuotaService()

    org_id = uuid4()
    past_date = datetime.now(UTC) - timedelta(days=2)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_expired",
        provider_subscription_id="sub_expired",
        provider_price_id=None,
        plan_tier="pro_500gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_500GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=past_date - timedelta(days=30),
        current_period_end=past_date,  # Expired 2 days ago!
    )

    reconciler = ReconcileSubscriptions(
        subscription_repository=repo,
        settings=settings,
        quota_service=quota_svc,
    )
    result = await reconciler.execute()

    assert result["total_checked"] == 1
    assert result["downgraded"] == 1

    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.plan_tier == "free"
    assert sub.storage_quota_bytes == DEFAULT_FREE_STORAGE_QUOTA_BYTES
    assert sub.status == "canceled"
    assert repo.organization_plans[org_id] == ("free", DEFAULT_FREE_STORAGE_QUOTA_BYTES)
    assert org_id in quota_svc.invalidated_orgs


class FakeBillingMailer:
    def __init__(self) -> None:
        self.sent_expiring_reminders: list[dict[str, Any]] = []
        self.sent_cancellations: list[dict[str, Any]] = []
        self.sent_renewals: list[dict[str, Any]] = []

    async def send_expiring_reminder(self, **kwargs: Any) -> bool:
        self.sent_expiring_reminders.append(kwargs)
        return True

    async def send_cancellation_confirmation(self, **kwargs: Any) -> bool:
        self.sent_cancellations.append(kwargs)
        return True

    async def send_renewal_confirmation(self, **kwargs: Any) -> bool:
        self.sent_renewals.append(kwargs)
        return True


class FakeNotificationService:
    def __init__(self) -> None:
        self.notifications: list[dict[str, Any]] = []

    async def create_notification(self, **kwargs: Any) -> None:
        self.notifications.append(kwargs)

    async def send_notification(self, **kwargs: Any) -> None:
        self.notifications.append(kwargs)


class FakeOrgWithMembersRepo:
    def __init__(self, owner_email: str = "producer@feedio.test") -> None:
        self.owner_email = owner_email

    async def get_by_id(self, org_id: UUID, user_id: UUID | None = None) -> Any:
        class FakeOrg:
            id = org_id
            name = "Test Studio"
            slug = "test-studio"
            plan_tier = "pro_100gb"
            storage_quota_bytes = PRO_100GB_STORAGE_QUOTA_BYTES

        return FakeOrg()

    async def list_members(self, org_id: UUID, cursor: str | None = None, limit: int = 50) -> Any:
        owner_email = self.owner_email

        class FakeMember:
            user_id = uuid4()
            email = owner_email
            organization_role = OrganizationRole.OWNER

        class FakePage:
            items = [FakeMember()]

        return FakePage()

    async def list_organization_members_with_users(self, org_id: UUID) -> list[Any]:
        class FakeUser:
            email = self.owner_email
            full_name = "Studio Owner"

        class FakeMember:
            user_id = uuid4()
            role = OrganizationRole.OWNER
            user = FakeUser()

        return [FakeMember()]


@pytest.mark.asyncio
async def test_cancel_subscription_at_period_end() -> None:
    """Verify standard SaaS cancel flow keeps paid quota until period end."""
    from datetime import timedelta

    from feedio.modules.billing.application.cancel_subscription import CancelSubscription

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    quota_svc = FakeQuotaService()
    mailer = FakeBillingMailer()
    notif_svc = FakeNotificationService()
    org_repo = FakeOrgWithMembersRepo()

    org_id = uuid4()
    end_date = datetime.now(UTC) + timedelta(days=15)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_cancel_test",
        provider_subscription_id="sub_cancel_test",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=end_date,
    )

    cancel_uc = CancelSubscription(
        subscription_repository=repo,
        settings=settings,
        quota_service=quota_svc,
        billing_mailer=mailer,
        notification_service=notif_svc,
        organization_repository=org_repo,
    )

    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    result = await cancel_uc.execute(
        context=org_ctx,
        immediate=False,
    )

    assert result.cancel_at_period_end is True
    assert result.plan_tier == "pro_100gb"  # Still Pro until period end
    assert result.storage_quota_bytes == PRO_100GB_STORAGE_QUOTA_BYTES

    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.cancel_at_period_end is True
    assert sub.canceled_at is not None

    # Check notification & email sent
    assert len(mailer.sent_cancellations) == 1
    assert mailer.sent_cancellations[0]["email"] == "producer@feedio.test"
    assert len(notif_svc.notifications) == 1


@pytest.mark.asyncio
async def test_cancel_subscription_immediate() -> None:
    """Verify immediate cancel downgrades to Free immediately."""
    from datetime import timedelta

    from feedio.modules.billing.application.cancel_subscription import CancelSubscription

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    quota_svc = FakeQuotaService()
    mailer = FakeBillingMailer()
    notif_svc = FakeNotificationService()
    org_repo = FakeOrgWithMembersRepo()

    org_id = uuid4()
    end_date = datetime.now(UTC) + timedelta(days=15)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_cancel_imm",
        provider_subscription_id="sub_cancel_imm",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=end_date,
    )

    cancel_uc = CancelSubscription(
        subscription_repository=repo,
        settings=settings,
        quota_service=quota_svc,
        billing_mailer=mailer,
        notification_service=notif_svc,
        organization_repository=org_repo,
    )

    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    result = await cancel_uc.execute(
        context=org_ctx,
        immediate=True,
    )

    assert result.plan_tier == "free"
    assert result.storage_quota_bytes == DEFAULT_FREE_STORAGE_QUOTA_BYTES
    assert result.status == "canceled"
    assert org_id in quota_svc.invalidated_orgs
    assert len(mailer.sent_cancellations) == 1
    assert mailer.sent_cancellations[0]["email"] == "producer@feedio.test"


@pytest.mark.asyncio
async def test_resume_subscription() -> None:
    """Verify un-canceling a subscription scheduled to cancel at period end."""
    from datetime import timedelta

    from feedio.modules.billing.application.resume_subscription import ResumeSubscription

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    notif_svc = FakeNotificationService()

    org_id = uuid4()
    end_date = datetime.now(UTC) + timedelta(days=10)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_resume",
        provider_subscription_id="sub_resume",
        provider_price_id=None,
        plan_tier="pro_500gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_500GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=end_date,
        cancel_at_period_end=True,
        canceled_at=datetime.now(UTC),
    )

    resume_uc = ResumeSubscription(
        subscription_repository=repo,
        settings=settings,
        notification_service=notif_svc,
    )

    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    result = await resume_uc.execute(context=org_ctx)
    assert result.cancel_at_period_end is False

    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.cancel_at_period_end is False
    assert sub.canceled_at is None


@pytest.mark.asyncio
async def test_renew_subscription_mock_extends_date() -> None:
    """Verify manual renewal extends the expiration period without auto-renewal."""
    from datetime import timedelta

    from feedio.modules.billing.application.renew_subscription import RenewSubscription

    repo = InMemorySubscriptionRepository()
    gateway = MockPaymentAdapter()
    settings = Settings()
    mailer = FakeBillingMailer()
    notif_svc = FakeNotificationService()
    org_repo = FakeOrgWithMembersRepo()

    org_id = uuid4()
    original_end = datetime.now(UTC) + timedelta(days=3)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_renew",
        provider_subscription_id="sub_renew",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=original_end,
        cancel_at_period_end=True,
    )

    renew_uc = RenewSubscription(
        subscription_repository=repo,
        payment_gateway=gateway,
        settings=settings,
        billing_mailer=mailer,
        notification_service=notif_svc,
        organization_repository=org_repo,
    )

    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    res = await renew_uc.execute(
        context=org_ctx,
        organization_slug="test-studio",
        user_email="producer@feedio.test",
        success_url="http://localhost:3000/app/org/billing?success=1",
        cancel_url="http://localhost:3000/app/org/billing?cancel=1",
    )

    assert res["status"] == "renewed"
    assert res["current_period_end"] is not None
    # End date should be extended by ~30 days from original_end
    res_dt = datetime.fromisoformat(res["current_period_end"])
    expected_approx_end = original_end + timedelta(days=30)
    assert abs((res_dt - expected_approx_end).total_seconds()) < 60

    sub = await repo.get_by_organization_id(org_id)
    assert sub is not None
    assert sub.cancel_at_period_end is False  # Canceled state reset on renewal
    assert len(mailer.sent_renewals) == 1
    assert len(notif_svc.notifications) == 1


@pytest.mark.asyncio
async def test_reconcile_subscriptions_sends_7d_reminder_and_deduplicates() -> None:
    """Verify 7-day expiration reminder is sent and deduplicated via events table."""
    from datetime import timedelta

    from feedio.modules.billing.application.reconcile_subscriptions import ReconcileSubscriptions

    repo = InMemorySubscriptionRepository()
    settings = Settings()
    quota_svc = FakeQuotaService()
    mailer = FakeBillingMailer()
    notif_svc = FakeNotificationService()
    org_repo = FakeOrgWithMembersRepo()

    org_id = uuid4()
    # Expiring in 4 days (within the 7-day window)
    expiring_end = datetime.now(UTC) + timedelta(days=4)
    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_7d_test",
        provider_subscription_id="sub_7d_test",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC) - timedelta(days=26),
        current_period_end=expiring_end,
    )

    reconciler = ReconcileSubscriptions(
        subscription_repository=repo,
        settings=settings,
        quota_service=quota_svc,
        organization_repository=org_repo,
        notification_service=notif_svc,
        billing_mailer=mailer,
    )

    # First run: should send reminder
    result1 = await reconciler.execute()
    assert result1["reminded_7d"] == 1
    assert len(mailer.sent_expiring_reminders) == 1
    assert mailer.sent_expiring_reminders[0]["email"] == "producer@feedio.test"
    assert mailer.sent_expiring_reminders[0]["days_left"] in (3, 4)
    assert len(notif_svc.notifications) == 1

    # Second run: deduplication should prevent sending reminder again
    result2 = await reconciler.execute()
    assert result2["reminded_7d"] == 0
    assert len(mailer.sent_expiring_reminders) == 1
    assert len(notif_svc.notifications) == 1


def test_mock_webhook_forbidden_in_production() -> None:
    """Verify that /api/v1/webhooks/mock returns 403 Forbidden in production."""
    prod_settings = Settings(
        environment="production",
        auth_cookie_secure=True,
        auth_jwt_secret="a" * 64,
    )
    gateway = MockPaymentAdapter()
    repo = InMemorySubscriptionRepository()
    processor = ProcessWebhookEvent(repo, settings=prod_settings)

    app = FastAPI()
    router = create_webhook_router(
        payment_gateway_provider=lambda: gateway,
        process_webhook_provider=lambda: processor,
        settings_provider=lambda: prod_settings,
    )
    app.include_router(router, prefix="/api/v1")

    client = TestClient(app)
    resp = client.post(
        "/api/v1/webhooks/mock",
        json={
            "event_type": "checkout.session.completed",
            "organization_id": str(uuid4()),
            "plan_tier": "pro_1tb",
            "billing_interval": "yearly",
        },
    )
    assert resp.status_code == 403
    assert "disabled in production" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_renew_subscription_rejects_free_tier_organization() -> None:
    """Verify that attempting to renew a free tier org raises SubscriptionNotFoundError."""
    from feedio.modules.billing.application.renew_subscription import RenewSubscription

    repo = InMemorySubscriptionRepository()
    gateway = MockPaymentAdapter()
    settings = Settings()
    org_id = uuid4()

    renew_uc = RenewSubscription(
        subscription_repository=repo,
        payment_gateway=gateway,
        settings=settings,
    )
    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    with pytest.raises(SubscriptionNotFoundError):
        await renew_uc.execute(
            context=org_ctx,
            organization_slug="free-org",
            user_email="user@test.io",
            success_url="http://localhost:3000/success",
            cancel_url="http://localhost:3000/cancel",
        )


@pytest.mark.asyncio
async def test_renew_subscription_disallows_mock_in_production() -> None:
    """Verify that manual mock renewal is blocked in production."""
    from datetime import timedelta
    from feedio.modules.billing.application.renew_subscription import RenewSubscription

    prod_settings = Settings(
        environment="production",
        auth_cookie_secure=True,
        auth_jwt_secret="a" * 64,
    )
    repo = InMemorySubscriptionRepository()
    gateway = MockPaymentAdapter()
    org_id = uuid4()

    await repo.upsert_subscription(
        organization_id=org_id,
        provider="mock",
        provider_customer_id="cust_test",
        provider_subscription_id="sub_test",
        provider_price_id=None,
        plan_tier="pro_100gb",
        billing_interval="monthly",
        storage_quota_bytes=PRO_100GB_STORAGE_QUOTA_BYTES,
        max_members=None,
        status="active",
        current_period_start=datetime.now(UTC),
        current_period_end=datetime.now(UTC) + timedelta(days=5),
        cancel_at_period_end=False,
    )

    renew_uc = RenewSubscription(
        subscription_repository=repo,
        payment_gateway=gateway,
        settings=prod_settings,
    )
    org_ctx = OrganizationContext(
        organization_id=org_id,
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    with pytest.raises(PaymentGatewayError):
        await renew_uc.execute(
            context=org_ctx,
            organization_slug="prod-org",
            user_email="user@test.io",
            success_url="http://localhost:3000/success",
            cancel_url="http://localhost:3000/cancel",
        )


@pytest.mark.asyncio
async def test_create_checkout_disallows_mock_gateway_in_production() -> None:
    """Verify CreateCheckoutSession blocks mock gateway in production."""
    prod_settings = Settings(
        environment="production",
        auth_cookie_secure=True,
        auth_jwt_secret="a" * 64,
        billing_provider="mock",
    )
    gateway = MockPaymentAdapter()
    checkout_uc = CreateCheckoutSession(
        payment_gateway=gateway,
        settings=prod_settings,
    )
    org_ctx = OrganizationContext(
        organization_id=uuid4(),
        user_id=uuid4(),
        role=OrganizationRole.OWNER,
    )

    with pytest.raises(PaymentGatewayError):
        await checkout_uc.execute(
            context=org_ctx,
            organization_slug="prod-org",
            user_email="user@test.io",
            plan_tier="pro_100gb",
            billing_interval="monthly",
            success_url="http://localhost:3000/success",
            cancel_url="http://localhost:3000/cancel",
        )



