"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { envConfig } from "../../../shared/config/env";
import type {
  PresenceUser,
  RealtimeCommentCreatedPayload,
  RealtimeCommentDeletedPayload,
  RealtimeDecisionUpdatedPayload,
  RealtimeEvent,
  RealtimePresenceJoinPayload,
  RealtimePresenceLeftPayload,
  RealtimePresenceSyncPayload,
} from "../types";

export interface UseRealtimeMediaOptions {
  mediaId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  enabled?: boolean;
  onCommentCreated?: (payload: RealtimeCommentCreatedPayload) => void;
  onCommentUpdated?: (payload: RealtimeCommentCreatedPayload) => void;
  onCommentDeleted?: (payload: RealtimeCommentDeletedPayload) => void;
  onDecisionUpdated?: (payload: RealtimeDecisionUpdatedPayload) => void;
  onPresenceChange?: (users: PresenceUser[]) => void;
}

export function useRealtimeMedia({
  mediaId,
  userId,
  userName,
  userEmail,
  userAvatar,
  enabled = true,
  onCommentCreated,
  onCommentUpdated,
  onCommentDeleted,
  onDecisionUpdated,
  onPresenceChange,
}: UseRealtimeMediaOptions) {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  const [isConnected, setIsConnected] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const callbacksRef = useRef({
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted,
    onDecisionUpdated,
    onPresenceChange,
  });

  useEffect(() => {
    queryClientRef.current = queryClient;
    callbacksRef.current = {
      onCommentCreated,
      onCommentUpdated,
      onCommentDeleted,
      onDecisionUpdated,
      onPresenceChange,
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
    let url = `${base}/api/v1/events/ws?media_id=${encodeURIComponent(mediaId)}`;
    if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
    if (userName) url += `&user_name=${encodeURIComponent(userName)}`;
    if (userEmail) url += `&user_email=${encodeURIComponent(userEmail)}`;
    if (userAvatar) url += `&user_avatar=${encodeURIComponent(userAvatar)}`;
    return url;
  }, [mediaId, userId, userName, userEmail, userAvatar]);

  useEffect(() => {
    if (!enabled || !mediaId) return;

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

          // Start ping interval from envConfig
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
              case "presence.sync": {
                const payload = data.payload as RealtimePresenceSyncPayload;
                setPresenceUsers(payload.users || []);
                callbacksRef.current.onPresenceChange?.(payload.users || []);
                break;
              }
              case "presence.joined": {
                const payload = data.payload as RealtimePresenceJoinPayload;
                setPresenceUsers((prev) => {
                  const filtered = prev.filter((u) => u.user_id !== payload.user.user_id);
                  const next = [...filtered, payload.user];
                  callbacksRef.current.onPresenceChange?.(next);
                  return next;
                });
                break;
              }
              case "presence.left": {
                const payload = data.payload as RealtimePresenceLeftPayload;
                setPresenceUsers((prev) => {
                  const next = prev.filter((u) => u.user_id !== payload.user_id);
                  callbacksRef.current.onPresenceChange?.(next);
                  return next;
                });
                break;
              }
              case "comment.created": {
                callbacksRef.current.onCommentCreated?.(
                  data.payload as RealtimeCommentCreatedPayload
                );
                break;
              }
              case "comment.updated": {
                callbacksRef.current.onCommentUpdated?.(
                  data.payload as RealtimeCommentCreatedPayload
                );
                break;
              }
              case "comment.deleted": {
                callbacksRef.current.onCommentDeleted?.(
                  data.payload as RealtimeCommentDeletedPayload
                );
                break;
              }
              case "notification.created": {
                queryClientRef.current.invalidateQueries({ queryKey: ["notifications"] });
                break;
              }
              case "decision.updated": {
                const payload = data.payload as RealtimeDecisionUpdatedPayload;
                queryClientRef.current.invalidateQueries({
                  predicate: (query) =>
                    query.queryKey.some(
                      (k) =>
                        typeof k === "string" &&
                        (k.includes("media") || k.includes("decisions")),
                    ),
                });
                callbacksRef.current.onDecisionUpdated?.(payload);
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
            // Exponential backoff retry: 1s, 2s, 4s, up to configured max delay
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
        // Fallback retry
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
  }, [enabled, mediaId, getWsUrl]);

  return {
    isConnected,
    presenceUsers,
  };
}
