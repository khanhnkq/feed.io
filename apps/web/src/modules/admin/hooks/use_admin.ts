"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getGetOverviewApiV1AdminOverviewGetQueryKey,
  getListOrganizationsApiV1AdminOrganizationsGetQueryKey,
  getListUsersApiV1AdminUsersGetQueryKey,
  getListAuditLogsApiV1AdminAuditLogsGetQueryKey,
  useGetOverviewApiV1AdminOverviewGet,
  useListAuditLogsApiV1AdminAuditLogsGet,
  useListOrganizationsApiV1AdminOrganizationsGet,
  useListUsersApiV1AdminUsersGet,
  useUpdateOrganizationQuotaApiV1AdminOrganizationsOrganizationIdQuotaPatch,
  useUpdateUserRoleApiV1AdminUsersUserIdRolePatch,
  useUpdateUserStatusApiV1AdminUsersUserIdStatusPatch,
  type AdminAuditLogResponse,
  type AdminOrganizationResponse,
  type AdminOverviewResponse,
  type AdminUserResponse,
} from "@feedio/api-client";

export function useAdminOverview(options?: { enabled?: boolean }) {
  return useGetOverviewApiV1AdminOverviewGet({
    query: {
      enabled: options?.enabled ?? true,
      refetchInterval: 30000,
    },
  });
}

export function useAdminUsers(options?: { enabled?: boolean }) {
  return useListUsersApiV1AdminUsersGet({
    query: {
      enabled: options?.enabled ?? true,
      staleTime: 10000,
    },
  });
}

export function useAdminOrganizations(options?: { enabled?: boolean }) {
  return useListOrganizationsApiV1AdminOrganizationsGet({
    query: {
      enabled: options?.enabled ?? true,
      staleTime: 10000,
    },
  });
}

export function useAdminAuditLogs(options?: { enabled?: boolean }) {
  return useListAuditLogsApiV1AdminAuditLogsGet({
    query: {
      enabled: options?.enabled ?? true,
      staleTime: 15000,
    },
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  return useUpdateUserRoleApiV1AdminUsersUserIdRolePatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListUsersApiV1AdminUsersGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetOverviewApiV1AdminOverviewGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListAuditLogsApiV1AdminAuditLogsGetQueryKey(),
        });
      },
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();
  return useUpdateUserStatusApiV1AdminUsersUserIdStatusPatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListUsersApiV1AdminUsersGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetOverviewApiV1AdminOverviewGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListAuditLogsApiV1AdminAuditLogsGetQueryKey(),
        });
      },
    },
  });
}

export function useUpdateOrgQuotaMutation() {
  const queryClient = useQueryClient();
  return useUpdateOrganizationQuotaApiV1AdminOrganizationsOrganizationIdQuotaPatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListOrganizationsApiV1AdminOrganizationsGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetOverviewApiV1AdminOverviewGetQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListAuditLogsApiV1AdminAuditLogsGetQueryKey(),
        });
      },
    },
  });
}
