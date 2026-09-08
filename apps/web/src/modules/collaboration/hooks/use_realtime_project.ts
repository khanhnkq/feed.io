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
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
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
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaCreated?.(
                  data.payload as RealtimeMediaCreatedPayload,
                );
                break;
              }
              case "media.updated": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaUpdated?.(
                  data.payload as RealtimeMediaUpdatedPayload,
                );
                break;
              }
              case "media.moved": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaMoved?.(
                  data.payload as RealtimeMediaMovedPayload,
                );
                break;
              }
              case "media.deleted": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaDeleted?.(
                  data.payload as RealtimeMediaDeletedPayload,
                );
                break;
              }
              case "media.transcoded": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaTranscoded?.(
                  data.payload as RealtimeMediaTranscodedPayload,
                );
                break;
              }
              case "media.transcode_failed": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onMediaTranscodeFailed?.(
                  data.payload as RealtimeMediaTranscodedPayload,
                );
                break;
              }
              case "decision.updated": {
                invalidateProjectMediaQuery();
                callbacksRef.current.onDecisionUpdated?.(
                  data.payload as RealtimeDecisionUpdatedPayload,
                );
                break;
              }
              case "folder.created": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onFolderCreated?.(
                  data.payload as RealtimeFolderCreatedPayload,
                );
                break;
              }
              case "folder.updated": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onFolderUpdated?.(
                  data.payload as RealtimeFolderUpdatedPayload,
                );
                break;
              }
              case "folder.moved": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onFolderMoved?.(
                  data.payload as RealtimeFolderMovedPayload,
                );
                break;
              }
              case "folder.deleted": {
                invalidateProjectFolderQuery();
                callbacksRef.current.onFolderDeleted?.(
                  data.payload as RealtimeFolderDeletedPayload,
                );
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
