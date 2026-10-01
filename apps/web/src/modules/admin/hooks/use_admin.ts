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
      onMutate: async ({ userId, data }) => {
        const queryKey = getListUsersApiV1AdminUsersGetQueryKey();
        await queryClient.cancelQueries({ queryKey });
        const previousUsers = queryClient.getQueryData<AdminUserResponse[]>(queryKey);

        if (previousUsers) {
          queryClient.setQueryData<AdminUserResponse[]>(
            queryKey,
            previousUsers.map((u) =>
              u.id === userId ? { ...u, platform_role: data.new_role as any } : u
            )
          );
        }

        return { previousUsers };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousUsers) {
          queryClient.setQueryData(
            getListUsersApiV1AdminUsersGetQueryKey(),
            context.previousUsers
          );
        }
      },
      onSuccess: (updatedUser, { userId }) => {
        if (updatedUser) {
          queryClient.setQueryData<AdminUserResponse[]>(
            getListUsersApiV1AdminUsersGetQueryKey(),
            (old) => old?.map((u) => (u.id === userId ? updatedUser : u)) ?? old
          );
        }
      },
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();
  return useUpdateUserStatusApiV1AdminUsersUserIdStatusPatch({
    mutation: {
      onMutate: async ({ userId, data }) => {
        const queryKey = getListUsersApiV1AdminUsersGetQueryKey();
        await queryClient.cancelQueries({ queryKey });
        const previousUsers = queryClient.getQueryData<AdminUserResponse[]>(queryKey);

        if (previousUsers) {
          queryClient.setQueryData<AdminUserResponse[]>(
            queryKey,
            previousUsers.map((u) =>
              u.id === userId ? { ...u, status: data.new_status as any } : u
            )
          );
        }

        return { previousUsers };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousUsers) {
          queryClient.setQueryData(
            getListUsersApiV1AdminUsersGetQueryKey(),
            context.previousUsers
          );
        }
      },
      onSuccess: (updatedUser, { userId }) => {
        if (updatedUser) {
          queryClient.setQueryData<AdminUserResponse[]>(
            getListUsersApiV1AdminUsersGetQueryKey(),
            (old) => old?.map((u) => (u.id === userId ? updatedUser : u)) ?? old
          );
        }
      },
    },
  });
}

export function useUpdateOrgQuotaMutation() {
  const queryClient = useQueryClient();
  return useUpdateOrganizationQuotaApiV1AdminOrganizationsOrganizationIdQuotaPatch({
    mutation: {
      onMutate: async ({ organizationId, data }) => {
        const queryKey = getListOrganizationsApiV1AdminOrganizationsGetQueryKey();
        await queryClient.cancelQueries({ queryKey });
        const previousOrgs = queryClient.getQueryData<AdminOrganizationResponse[]>(queryKey);

        if (previousOrgs) {
          queryClient.setQueryData<AdminOrganizationResponse[]>(
            queryKey,
            previousOrgs.map((org) =>
              org.id === organizationId
                ? { ...org, storage_limit_bytes: data.new_quota_bytes }
                : org
            )
          );
        }

        return { previousOrgs };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousOrgs) {
          queryClient.setQueryData(
            getListOrganizationsApiV1AdminOrganizationsGetQueryKey(),
            context.previousOrgs
          );
        }
      },
      onSuccess: (updatedOrg, { organizationId }) => {
        if (updatedOrg) {
          queryClient.setQueryData<AdminOrganizationResponse[]>(
            getListOrganizationsApiV1AdminOrganizationsGetQueryKey(),
            (old) => old?.map((org) => (org.id === organizationId ? updatedOrg : org)) ?? old
          );
        }
      },
    },
  });
}
