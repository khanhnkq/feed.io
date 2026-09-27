"""Constants and definitions for Feedi pricing and subscription plans.

Follows the FreeFrame pricing benchmark:
- Storage-tiered pricing (5 GB free; 100 GB, 500 GB, 1 TB pro tiers)
- No per-seat pricing. Ever.
- Free tier is capped at 5 members. All paid tiers have unlimited members.
"""

from typing import Final

# Storage Quotas (in bytes)
DEFAULT_FREE_STORAGE_QUOTA_BYTES: Final[int] = 5 * 1024 * 1024 * 1024  # 5 GB = 5,368,709,120 bytes
PRO_100GB_STORAGE_QUOTA_BYTES: Final[int] = 100 * 1024 * 1024 * 1024  # 100 GB = 107,374,182,400 bytes
PRO_500GB_STORAGE_QUOTA_BYTES: Final[int] = 500 * 1024 * 1024 * 1024  # 500 GB = 536,870,912,000 bytes
PRO_1TB_STORAGE_QUOTA_BYTES: Final[int] = 1024 * 1024 * 1024 * 1024  # 1 TB = 1,099,511,627,776 bytes

# Member Limits
FREE_TIER_MAX_MEMBERS: Final[int] = 5

VALID_PLAN_TIERS: Final[set[str]] = {
    "free",
    "pro_100gb",
    "pro_500gb",
    "pro_1tb",
    "enterprise",
}

VALID_BILLING_INTERVALS: Final[set[str]] = {
    "monthly",
    "yearly",
}

VALID_SUBSCRIPTION_STATUSES: Final[set[str]] = {
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "incomplete_expired",
}

PLAN_QUOTAS_MAP: Final[dict[str, int]] = {
    "free": DEFAULT_FREE_STORAGE_QUOTA_BYTES,
    "pro_100gb": PRO_100GB_STORAGE_QUOTA_BYTES,
    "pro_500gb": PRO_500GB_STORAGE_QUOTA_BYTES,
    "pro_1tb": PRO_1TB_STORAGE_QUOTA_BYTES,
}

PLAN_MAX_MEMBERS_MAP: Final[dict[str, int | None]] = {
    "free": FREE_TIER_MAX_MEMBERS,
    "pro_100gb": None,
    "pro_500gb": None,
    "pro_1tb": None,
    "enterprise": None,
}
