"""Public interfaces, adapters, and router factories for the billing module."""

from feedio.modules.billing.application.create_checkout_session import CreateCheckoutSession
from feedio.modules.billing.application.create_portal_session import CreatePortalSession
from feedio.modules.billing.application.get_organization_billing import GetOrganizationBilling
from feedio.modules.billing.application.ports import PaymentGatewayPort, SubscriptionRepository
from feedio.modules.billing.application.process_webhook_event import ProcessWebhookEvent
from feedio.modules.billing.application.reconcile_subscriptions import ReconcileSubscriptions
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
from feedio.modules.billing.domain.entities import BillingOverview, SubscriptionRecord
from feedio.modules.billing.domain.errors import (
    BillingError,
    InsufficientBillingPermissionError,
    InvalidBillingIntervalError,
    InvalidPlanTierError,
    PaymentGatewayError,
    SubscriptionNotFoundError,
    WebhookVerificationError,
)
from feedio.modules.billing.infrastructure.adapters.mock_adapter import MockPaymentAdapter
from feedio.modules.billing.infrastructure.adapters.stripe_adapter import StripePaymentAdapter
from feedio.modules.billing.infrastructure.models import SubscriptionEventTable, SubscriptionTable
from feedio.modules.billing.infrastructure.repository import SqlSubscriptionRepository
from feedio.modules.billing.presentation.billing_router import create_billing_router
from feedio.modules.billing.presentation.schemas import (
    BillingOverviewResponse,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionRequest,
    CreatePortalSessionResponse,
    MockWebhookTriggerRequest,
)
from feedio.modules.billing.presentation.webhook_router import create_webhook_router

__all__ = [
    "BillingError",
    "BillingOverview",
    "BillingOverviewResponse",
    "CreateCheckoutSession",
    "CreateCheckoutSessionRequest",
    "CreateCheckoutSessionResponse",
    "CreatePortalSession",
    "CreatePortalSessionRequest",
    "CreatePortalSessionResponse",
    "DEFAULT_FREE_STORAGE_QUOTA_BYTES",
    "FREE_TIER_MAX_MEMBERS",
    "GetOrganizationBilling",
    "InsufficientBillingPermissionError",
    "InvalidBillingIntervalError",
    "InvalidPlanTierError",
    "MockPaymentAdapter",
    "MockWebhookTriggerRequest",
    "PLAN_MAX_MEMBERS_MAP",
    "PLAN_QUOTAS_MAP",
    "PRO_1TB_STORAGE_QUOTA_BYTES",
    "PRO_100GB_STORAGE_QUOTA_BYTES",
    "PRO_500GB_STORAGE_QUOTA_BYTES",
    "PaymentGatewayError",
    "PaymentGatewayPort",
    "ProcessWebhookEvent",
    "ReconcileSubscriptions",
    "SqlSubscriptionRepository",
    "StripePaymentAdapter",
    "SubscriptionEventTable",
    "SubscriptionNotFoundError",
    "SubscriptionRecord",
    "SubscriptionRepository",
    "SubscriptionTable",
    "VALID_BILLING_INTERVALS",
    "VALID_PLAN_TIERS",
    "VALID_SUBSCRIPTION_STATUSES",
    "WebhookVerificationError",
    "create_billing_router",
    "create_webhook_router",
]
