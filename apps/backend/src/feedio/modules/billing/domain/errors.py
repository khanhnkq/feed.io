"""Domain errors for the billing module."""


class BillingError(Exception):
    """Base exception for billing domain errors."""


class InvalidPlanTierError(BillingError):
    """Raised when an unrecognized or unsupported plan tier is specified."""


class InvalidBillingIntervalError(BillingError):
    """Raised when an invalid billing interval (e.g. not monthly or yearly) is specified."""


class SubscriptionNotFoundError(BillingError):
    """Raised when a requested subscription is not found."""


class WebhookVerificationError(BillingError):
    """Raised when a payment gateway webhook signature cannot be verified."""


class PaymentGatewayError(BillingError):
    """Raised when an external payment gateway call fails."""


class InsufficientBillingPermissionError(BillingError):
    """Raised when a user lacks permission to manage billing for an organization."""
