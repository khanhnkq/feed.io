"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@feedio/api-client";
import type {
  NotificationRecord,
  PaginatedNotifications,
  UnreadCountResponse,
} from "../types";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export interface UseNotificationsOptions {
  organizationId?: string | null;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string | null;
  enabled?: boolean;
}

export function useNotifications({
  organizationId,
  unreadOnly = false,
  limit = 30,
  cursor,
  enabled = true,
}: UseNotificationsOptions = {}) {
  return useQuery<PaginatedNotifications>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, { organizationId, unreadOnly, limit, cursor }],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        limit,
        unread_only: unreadOnly,
      };
      if (organizationId) params.organization_id = organizationId;
      if (cursor) params.cursor = cursor;

      const response = await client.get<PaginatedNotifications>("/api/v1/notifications", {
        params,
      });
      return response.data;
    },
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount({
  organizationId,
  enabled = true,
}: {
  organizationId?: string | null;
  enabled?: boolean;
} = {}) {
  return useQuery<number>({
    queryKey: [...UNREAD_COUNT_QUERY_KEY, { organizationId }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (organizationId) params.organization_id = organizationId;

      const response = await client.get<UnreadCountResponse>(
        "/api/v1/notifications/unread-count",
        { params }
      );
      return response.data.unread_count;
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await client.patch<NotificationRecord>(
        `/api/v1/notifications/${notificationId}/read`
      );
      return response.data;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

      const previousNotifications = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      const previousUnreadCount = queryClient.getQueriesData<number>({
        queryKey: UNREAD_COUNT_QUERY_KEY,
      });

      const now = new Date().toISOString();

      // Optimistically update notifications list (0ms)
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: NOTIFICATIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === notificationId ? { ...item, is_read: true, read_at: now } : item
            ),
            total_unread: Math.max(0, old.total_unread - 1),
          };
        }
      );

      // Decrement unread count (0ms)
      queryClient.setQueriesData<number>(
        { queryKey: UNREAD_COUNT_QUERY_KEY },
        (prev) => (prev !== undefined ? Math.max(0, prev - 1) : 0)
      );

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_err, _notificationId, context) => {
      context?.previousNotifications.forEach(([qKey, qData]) => {
        queryClient.setQueryData(qKey, qData);
      });
      context?.previousUnreadCount.forEach(([qKey, qData]) => {
        queryClient.setQueryData(qKey, qData);
      });
    },
    onSuccess: (updated) => {
      // Sync exact server timestamp without refetching
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: NOTIFICATIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === updated.id ? { ...item, is_read: true, read_at: updated.read_at } : item
            ),
          };
        }
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId?: string | null) => {
      const params: Record<string, string> = {};
      if (organizationId) params.organization_id = organizationId;
      const response = await client.post<UnreadCountResponse>(
        "/api/v1/notifications/mark-all-read",
        null,
        { params }
      );
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

      const previousNotifications = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      const previousUnreadCount = queryClient.getQueriesData<number>({
        queryKey: UNREAD_COUNT_QUERY_KEY,
      });

      const now = new Date().toISOString();

      // Optimistically mark all read (0ms)
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: NOTIFICATIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => ({
              ...item,
              is_read: true,
              read_at: now,
            })),
            total_unread: 0,
          };
        }
      );

      queryClient.setQueriesData<number>({ queryKey: UNREAD_COUNT_QUERY_KEY }, 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_err, _orgId, context) => {
      context?.previousNotifications.forEach(([qKey, qData]) => {
        queryClient.setQueryData(qKey, qData);
      });
      context?.previousUnreadCount.forEach(([qKey, qData]) => {
        queryClient.setQueryData(qKey, qData);
      });
    },
  });
}
