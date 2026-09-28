import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBillingOverview,
  fetchPlatformSettings,
  requestCheckoutSession,
  requestPortalSession,
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
