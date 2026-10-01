"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { envConfig } from "../../../shared/config/env";
import type {
  RealtimeDecisionUpdatedPayload,
  RealtimeEvent,
  RealtimeFolderCreatedPayload,
  RealtimeFolderDeletedPayload,
  RealtimeFolderMovedPayload,
  RealtimeFolderUpdatedPayload,
  RealtimeMediaCreatedPayload,
  RealtimeMediaDeletedPayload,
  RealtimeMediaMovedPayload,
  RealtimeMediaTranscodedPayload,
  RealtimeMediaUpdatedPayload,
  RealtimeProjectDeletedPayload,
  RealtimeProjectMembersUpdatedPayload,
  RealtimeProjectUpdatedPayload,
} from "../types";

export interface UseRealtimeProjectOptions {
  projectId: string;
  organizationId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  enabled?: boolean;
  onMediaCreated?: (payload: RealtimeMediaCreatedPayload) => void;
  onMediaUpdated?: (payload: RealtimeMediaUpdatedPayload) => void;
  onMediaMoved?: (payload: RealtimeMediaMovedPayload) => void;
  onMediaDeleted?: (payload: RealtimeMediaDeletedPayload) => void;
  onMediaTranscoded?: (payload: RealtimeMediaTranscodedPayload) => void;
  onMediaTranscodeFailed?: (payload: RealtimeMediaTranscodedPayload) => void;
  onDecisionUpdated?: (payload: RealtimeDecisionUpdatedPayload) => void;
  onFolderCreated?: (payload: RealtimeFolderCreatedPayload) => void;
  onFolderUpdated?: (payload: RealtimeFolderUpdatedPayload) => void;
  onFolderMoved?: (payload: RealtimeFolderMovedPayload) => void;
  onFolderDeleted?: (payload: RealtimeFolderDeletedPayload) => void;
  onProjectUpdated?: (payload: RealtimeProjectUpdatedPayload) => void;
  onProjectDeleted?: (payload: RealtimeProjectDeletedPayload) => void;
  onMembersUpdated?: (payload: RealtimeProjectMembersUpdatedPayload) => void;
}

export function useRealtimeProject({
  projectId,
  organizationId,
  userId,
  userName,
  userEmail,
  userAvatar,
  enabled = true,
  onMediaCreated,
  onMediaUpdated,
  onMediaMoved,
  onMediaDeleted,
  onMediaTranscoded,
  onMediaTranscodeFailed,
  onDecisionUpdated,
  onFolderCreated,
  onFolderUpdated,
  onFolderMoved,
  onFolderDeleted,
  onProjectUpdated,
  onProjectDeleted,
  onMembersUpdated,
}: UseRealtimeProjectOptions) {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const callbacksRef = useRef({
    onMediaCreated,
    onMediaUpdated,
    onMediaMoved,
    onMediaDeleted,
    onMediaTranscoded,
    onMediaTranscodeFailed,
    onDecisionUpdated,
    onFolderCreated,
    onFolderUpdated,
    onFolderMoved,
    onFolderDeleted,
    onProjectUpdated,
    onProjectDeleted,
    onMembersUpdated,
  });

  useEffect(() => {
    queryClientRef.current = queryClient;
    callbacksRef.current = {
      onMediaCreated,
      onMediaUpdated,
      onMediaMoved,
      onMediaDeleted,
      onMediaTranscoded,
      onMediaTranscodeFailed,
      onDecisionUpdated,
      onFolderCreated,
      onFolderUpdated,
      onFolderMoved,
      onFolderDeleted,
      onProjectUpdated,
      onProjectDeleted,
      onMembersUpdated,
    };
  });

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined") return "";

    let base = envConfig.wsUrl;
    if (base.startsWith("http://")) {
      base = "ws://" + base.slice(7);
    } else if (base.startsWith("https://")) {
      base = "wss://" + base.slice(8);
    } else if (!base.startsWith("ws://") && !base.startsWith("wss://")) {
      const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      base = `${proto}//${base}`;
    }

    base = base.replace(/\/+$/, "");
    let url = `${base}/api/v1/events/ws?room=project:${encodeURIComponent(projectId)}`;
    if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
    if (userName) url += `&user_name=${encodeURIComponent(userName)}`;
    if (userEmail) url += `&user_email=${encodeURIComponent(userEmail)}`;
    if (userAvatar) url += `&user_avatar=${encodeURIComponent(userAvatar)}`;
    return url;
  }, [projectId, userId, userName, userEmail, userAvatar]);

  const ingestMediaCreated = useCallback((payload: RealtimeMediaCreatedPayload) => {
    const newMedia = payload.media as any;
    if (newMedia?.id) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          if (old.items.some((item: any) => item.id === newMedia.id)) return old;
          return {
            ...old,
            items: [newMedia, ...old.items],
            total: typeof old.total === "number" ? old.total + 1 : old.total,
          };
        },
      );
    }
  }, [projectId]);

  const ingestMediaUpdated = useCallback((payload: RealtimeMediaUpdatedPayload) => {
    const updatedMedia = payload.media as any;
    if (updatedMedia?.id) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.id === updatedMedia.id ? { ...item, ...updatedMedia } : item,
            ),
          };
        },
      );
      queryClientRef.current.setQueriesData<any>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k === updatedMedia.id),
        },
        (old: any) => (old?.id === updatedMedia.id ? { ...old, ...updatedMedia } : old),
      );
    }
  }, [projectId]);

  const ingestMediaMoved = useCallback((payload: RealtimeMediaMovedPayload) => {
    const movedMedia = payload.media as any;
    const mediaId = movedMedia?.id;
    if (mediaId) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.id === mediaId ? { ...item, ...movedMedia, folder_id: payload.folder_id ?? null } : item,
            ),
          };
        },
      );
    }
  }, [projectId]);

  const ingestMediaDeleted = useCallback((payload: RealtimeMediaDeletedPayload) => {
    const mediaId = payload.media_id;
    if (mediaId) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.filter((item: any) => item.id !== mediaId),
            total: typeof old.total === "number" ? Math.max(0, old.total - 1) : old.total,
          };
        },
      );
    }
  }, [projectId]);

  const ingestMediaTranscoded = useCallback((payload: RealtimeMediaTranscodedPayload) => {
    const { media_id, ...updates } = payload;
    if (media_id) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.id === media_id ? { ...item, ...updates } : item,
            ),
          };
        },
      );
      queryClientRef.current.setQueriesData<any>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k === media_id),
        },
        (old: any) => (old?.id === media_id ? { ...old, ...updates } : old),
      );
    }
  }, [projectId]);

  const ingestDecisionUpdated = useCallback((payload: RealtimeDecisionUpdatedPayload) => {
    const { media_id, status: newStatus } = payload;
    if (media_id) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("media")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.id === media_id ? { ...item, review_status: newStatus } : item,
            ),
          };
        },
      );
      queryClientRef.current.setQueriesData<any>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k === media_id),
        },
        (old: any) => (old?.id === media_id ? { ...old, review_status: newStatus } : old),
      );
    }
  }, [projectId]);

  const ingestFolderCreated = useCallback((payload: RealtimeFolderCreatedPayload) => {
    const newFolder = payload.folder as any;
    if (newFolder?.id) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
        },
        (old) => {
          if (!old?.items) return old;
          if (old.items.some((f: any) => f.id === newFolder.id)) return old;
          return {
            ...old,
            items: [...old.items, newFolder],
            total: typeof old.total === "number" ? old.total + 1 : old.total,
          };
        },
      );
      queryClientRef.current.setQueriesData<any[]>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
        },
        (old) => {
          if (!Array.isArray(old)) return old;
          if (old.some((f: any) => f.id === newFolder.id)) return old;
          return [...old, newFolder];
        },
      );
    }
  }, [projectId]);

  const ingestFolderUpdated = useCallback((payload: RealtimeFolderUpdatedPayload) => {
    const folderId = payload.folder_id;
    const folderName = payload.name;
    if (folderId) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((f: any) =>
              f.id === folderId ? { ...f, name: folderName, ...payload.folder } : f,
            ),
          };
        },
      );
      queryClientRef.current.setQueriesData<any[]>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
        },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((f: any) =>
            f.id === folderId ? { ...f, name: folderName, ...payload.folder } : f,
          );
        },
      );
    }
  }, [projectId]);

  const ingestFolderMoved = useCallback((payload: RealtimeFolderMovedPayload) => {
    const folderId = payload.folder_id;
    const targetParentId = payload.target_parent_id ?? null;
    if (folderId) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((f: any) =>
              f.id === folderId ? { ...f, parent_id: targetParentId, ...payload.folder } : f,
            ),
          };
        },
      );
      queryClientRef.current.setQueriesData<any[]>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
        },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((f: any) =>
            f.id === folderId ? { ...f, parent_id: targetParentId, ...payload.folder } : f,
          );
        },
      );
    }
  }, [projectId]);

  const ingestFolderDeleted = useCallback((payload: RealtimeFolderDeletedPayload) => {
    const folderId = payload.folder_id;
    if (folderId) {
      queryClientRef.current.setQueriesData<{ items?: any[]; total?: number }>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
        },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.filter((f: any) => f.id !== folderId),
            total: typeof old.total === "number" ? Math.max(0, old.total - 1) : old.total,
          };
        },
      );
      queryClientRef.current.setQueriesData<any[]>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
        },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((f: any) => f.id !== folderId);
        },
      );
    }
  }, [projectId]);

  const invalidateProjectMediaQuery = useCallback(() => {
    queryClientRef.current.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) =>
            typeof k === "string" &&
            (k.includes(projectId) || k.includes("media")),
        ),
    });
  }, [projectId]);

  const invalidateProjectFolderQuery = useCallback(() => {
    queryClientRef.current.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) =>
            typeof k === "string" &&
            (k.includes(projectId) ||
              k.includes("folders") ||
              k.includes("media") ||
              k.includes("projects")),
        ),
    });
  }, [projectId]);

  const invalidateProjectMembersQuery = useCallback(() => {
    queryClientRef.current.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) =>
            typeof k === "string" &&
            (k.includes(projectId) ||
              k.includes("members") ||
              (organizationId && k.includes(organizationId))),
        ),
    });
  }, [projectId, organizationId]);

  useEffect(() => {
    if (!enabled || !projectId) return;

    let isDestroyed = false;

    function connect() {
      if (isDestroyed) return;
      const url = getWsUrl();
      if (!url) return;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDestroyed) {
            ws.close();
            return;
          }
          setIsConnected(true);
          retryCountRef.current = 0;

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, envConfig.wsPingIntervalMs);
        };

        ws.onmessage = (event) => {
          try {
            const data: RealtimeEvent<unknown> = JSON.parse(event.data);
            if (!data.event_type) return;

            switch (data.event_type) {
              case "media.created": {
                const p = data.payload as RealtimeMediaCreatedPayload;
                ingestMediaCreated(p);
                callbacksRef.current.onMediaCreated?.(p);
                break;
              }
              case "media.updated": {
                const p = data.payload as RealtimeMediaUpdatedPayload;
                ingestMediaUpdated(p);
                callbacksRef.current.onMediaUpdated?.(p);
                break;
              }
              case "media.moved": {
                const p = data.payload as RealtimeMediaMovedPayload;
                ingestMediaMoved(p);
                callbacksRef.current.onMediaMoved?.(p);
                break;
              }
              case "media.deleted": {
                const p = data.payload as RealtimeMediaDeletedPayload;
                ingestMediaDeleted(p);
                callbacksRef.current.onMediaDeleted?.(p);
                break;
              }
              case "media.transcoded": {
                const p = data.payload as RealtimeMediaTranscodedPayload;
                ingestMediaTranscoded(p);
                callbacksRef.current.onMediaTranscoded?.(p);
                break;
              }
              case "media.transcode_failed": {
                const p = data.payload as RealtimeMediaTranscodedPayload;
                ingestMediaTranscoded(p);
                callbacksRef.current.onMediaTranscodeFailed?.(p);
                break;
              }
              case "decision.updated": {
                const p = data.payload as RealtimeDecisionUpdatedPayload;
                ingestDecisionUpdated(p);
                callbacksRef.current.onDecisionUpdated?.(p);
                break;
              }
              case "folder.created": {
                const p = data.payload as RealtimeFolderCreatedPayload;
                ingestFolderCreated(p);
                callbacksRef.current.onFolderCreated?.(p);
                break;
              }
              case "folder.updated": {
                const p = data.payload as RealtimeFolderUpdatedPayload;
                ingestFolderUpdated(p);
                callbacksRef.current.onFolderUpdated?.(p);
                break;
              }
              case "folder.moved": {
                const p = data.payload as RealtimeFolderMovedPayload;
                ingestFolderMoved(p);
                callbacksRef.current.onFolderMoved?.(p);
                break;
              }
              case "folder.deleted": {
                const p = data.payload as RealtimeFolderDeletedPayload;
                ingestFolderDeleted(p);
                callbacksRef.current.onFolderDeleted?.(p);
                break;
              }
              case "project.updated": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onProjectUpdated?.(
                  data.payload as RealtimeProjectUpdatedPayload,
                );
                break;
              }
              case "project.deleted": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onProjectDeleted?.(
                  data.payload as RealtimeProjectDeletedPayload,
                );
                break;
              }
              case "project.members_updated": {
                invalidateProjectMembersQuery();
                callbacksRef.current.onMembersUpdated?.(
                  data.payload as RealtimeProjectMembersUpdatedPayload,
                );
                break;
              }
              case "notification.created": {
                queryClientRef.current.invalidateQueries({
                  queryKey: ["notifications"],
                });
                break;
              }
              default:
                break;
            }
          } catch {
            // Ignore non-json or malformed frames
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (!isDestroyed) {
            const delay = Math.min(
              1000 * Math.pow(2, retryCountRef.current),
              envConfig.wsReconnectMaxDelayMs,
            );
            retryCountRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!isDestroyed) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isDestroyed = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [
    enabled,
    projectId,
    getWsUrl,
    invalidateProjectMediaQuery,
    invalidateProjectFolderQuery,
    invalidateProjectMembersQuery,
  ]);

  return {
    isConnected,
  };
}
