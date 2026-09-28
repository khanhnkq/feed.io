export type PlanTier = "free" | "pro_100gb" | "pro_500gb" | "pro_1tb" | "enterprise";
export type BillingInterval = "monthly" | "yearly";

export interface BillingOverview {
  organization_id: string;
  plan_tier: string;
  billing_interval: string | null;
  status: string;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  storage_usage_percentage: number;
  active_members_count: number;
  max_members: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_payment_method: boolean;
  payments_enabled: boolean;
}

export interface PlatformSettings {
  payments_enabled: boolean;
  billing_provider: string;
}

export interface UpdatePlatformSettingsRequest {
  payments_enabled: boolean;
}

export interface CreateCheckoutSessionRequest {
  plan_tier: string;
  billing_interval: BillingInterval;
  success_url: string;
  cancel_url: string;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
}

export interface CreatePortalSessionRequest {
  return_url: string;
}

export interface CreatePortalSessionResponse {
  portal_url: string;
}

export interface MockWebhookTriggerRequest {
  event_type?: string;
  organization_id: string;
  plan_tier: string;
  billing_interval: string;
}

export interface CancelSubscriptionRequest {
  immediate?: boolean;
}

export interface RenewSubscriptionRequest {
  billing_interval?: BillingInterval;
  success_url: string;
  cancel_url: string;
}

export interface RenewSubscriptionResponse {
  status: string;
  checkout_url?: string | null;
  plan_tier?: string | null;
  current_period_end?: string | null;
}
