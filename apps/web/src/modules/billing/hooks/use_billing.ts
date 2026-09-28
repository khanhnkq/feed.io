import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  fetchBillingOverview,
  fetchPlatformSettings,
  renewSubscription,
  requestCheckoutSession,
  requestPortalSession,
  resumeSubscription,
  triggerMockWebhook,
  updatePlatformSettings,
} from "../lib/billing_api";
import type {
  CreateCheckoutSessionRequest,
  CreatePortalSessionRequest,
  MockWebhookTriggerRequest,
  UpdatePlatformSettingsRequest,
} from "../types";

export const PLATFORM_SETTINGS_QUERY_KEY = ["admin", "platform-settings"] as const;

export function usePlatformSettings() {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_QUERY_KEY,
    queryFn: fetchPlatformSettings,
    staleTime: 5_000,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePlatformSettingsRequest) =>
      updatePlatformSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function getBillingQueryKey(organizationId: string) {
  return ["organizations", organizationId, "billing"] as const;
}

export function useOrganizationBilling(organizationId: string) {
  return useQuery({
    queryKey: getBillingQueryKey(organizationId),
    queryFn: () => fetchBillingOverview(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 10_000,
  });
}

export function useCreateCheckout(organizationId: string) {
  return useMutation({
    mutationFn: (payload: CreateCheckoutSessionRequest) =>
      requestCheckoutSession(organizationId, payload),
  });
}

export function useCreatePortal(organizationId: string) {
  return useMutation({
    mutationFn: (payload: CreatePortalSessionRequest) =>
      requestPortalSession(organizationId, payload),
  });
}

export function useTriggerMockUpgrade(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MockWebhookTriggerRequest) => triggerMockWebhook(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBillingQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useCancelSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { immediate?: boolean } = {}) =>
      cancelSubscription(organizationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBillingQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useResumeSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resumeSubscription(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBillingQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useRenewSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { status: string; checkout_url?: string | null; plan_tier?: string | null; current_period_end?: string | null },
    Error,
    { billing_interval?: string; success_url: string; cancel_url: string }
  >({
    mutationFn: (payload) =>
      renewSubscription(organizationId, payload),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        queryClient.invalidateQueries({ queryKey: getBillingQueryKey(organizationId) });
        queryClient.invalidateQueries({ queryKey: ["organization"] });
      }
    },
  });
}
