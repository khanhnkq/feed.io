import { client } from "@feedio/api-client";
import type {
  BillingOverview,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  MockWebhookTriggerRequest,
  PlatformSettings,
  UpdatePlatformSettingsRequest,
} from "../types";

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const response = await client.get<PlatformSettings>("/api/v1/admin/platform-settings");
  return response.data;
}

export async function updatePlatformSettings(
  payload: UpdatePlatformSettingsRequest
): Promise<PlatformSettings> {
  const response = await client.patch<PlatformSettings>(
    "/api/v1/admin/platform-settings",
    payload
  );
  return response.data;
}

export async function fetchBillingOverview(
  organizationId: string
): Promise<BillingOverview> {
  const response = await client.get<BillingOverview>(
    `/api/v1/organizations/${organizationId}/billing`
  );
  return response.data;
}

export async function requestCheckoutSession(
  organizationId: string,
  payload: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const response = await client.post<CreateCheckoutSessionResponse>(
    `/api/v1/organizations/${organizationId}/billing/checkout`,
    payload
  );
  return response.data;
}

export async function requestPortalSession(
  organizationId: string,
  payload: CreatePortalSessionRequest
): Promise<CreatePortalSessionResponse> {
  const response = await client.post<CreatePortalSessionResponse>(
    `/api/v1/organizations/${organizationId}/billing/portal`,
    payload
  );
  return response.data;
}

export async function triggerMockWebhook(
  payload: MockWebhookTriggerRequest
): Promise<{ received: boolean; result: unknown }> {
  const response = await client.post<{ received: boolean; result: unknown }>(
    `/api/v1/webhooks/mock`,
    payload
  );
  return response.data;
}

export async function cancelSubscription(
  organizationId: string,
  payload: { immediate?: boolean } = {}
): Promise<BillingOverview> {
  const response = await client.post<BillingOverview>(
    `/api/v1/organizations/${organizationId}/billing/cancel`,
    payload
  );
  return response.data;
}

export async function resumeSubscription(
  organizationId: string
): Promise<BillingOverview> {
  const response = await client.post<BillingOverview>(
    `/api/v1/organizations/${organizationId}/billing/resume`
  );
  return response.data;
}

export async function renewSubscription(
  organizationId: string,
  payload: { billing_interval?: string; success_url: string; cancel_url: string }
): Promise<{ status: string; checkout_url?: string | null; plan_tier?: string | null; current_period_end?: string | null }> {
  const response = await client.post<{
    status: string;
    checkout_url?: string | null;
    plan_tier?: string | null;
    current_period_end?: string | null;
  }>(`/api/v1/organizations/${organizationId}/billing/renew`, payload);
  return response.data;
}
