"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { envConfig } from "../../../shared/config/env";
import type {
  RealtimeEvent,
  RealtimeOrganizationMembersUpdatedPayload,
  RealtimeSessionRevokedPayload,
} from "../types";

export interface UseRealtimeUserOptions {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  enabled?: boolean;
  onSessionRevoked?: (payload: RealtimeSessionRevokedPayload) => void;
  onNotificationCreated?: () => void;
  onOrgMembersUpdated?: (payload: RealtimeOrganizationMembersUpdatedPayload) => void;
}

export function useRealtimeUser({
  userId,
  userName,
  userEmail,
  userAvatar,
  enabled = true,
  onSessionRevoked,
  onNotificationCreated,
  onOrgMembersUpdated,
}: UseRealtimeUserOptions) {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  const router = useRouter();
  const routerRef = useRef(router);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const callbacksRef = useRef({
    onSessionRevoked,
    onNotificationCreated,
    onOrgMembersUpdated,
  });

  useEffect(() => {
    queryClientRef.current = queryClient;
    routerRef.current = router;
    callbacksRef.current = {
      onSessionRevoked,
      onNotificationCreated,
      onOrgMembersUpdated,
    };
  });

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined" || !userId) return "";

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
    let url = `${base}/api/v1/events/ws?room=user:${encodeURIComponent(userId)}`;
    if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
    if (userName) url += `&user_name=${encodeURIComponent(userName)}`;
    if (userEmail) url += `&user_email=${encodeURIComponent(userEmail)}`;
    if (userAvatar) url += `&user_avatar=${encodeURIComponent(userAvatar)}`;
    return url;
  }, [userId, userName, userEmail, userAvatar]);

  useEffect(() => {
    if (!enabled || !userId) return;

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
              case "session.revoked": {
                const payload = data.payload as RealtimeSessionRevokedPayload;
                callbacksRef.current.onSessionRevoked?.(payload);
                queryClientRef.current.clear();
                routerRef.current.replace("/login?reason=session_revoked");
                break;
              }
              case "notification.created": {
                queryClientRef.current.invalidateQueries({
                  queryKey: ["notifications"],
                });
                callbacksRef.current.onNotificationCreated?.();
                break;
              }
              case "organization.members_updated": {
                queryClientRef.current.invalidateQueries({
                  predicate: (query) =>
                    query.queryKey.some(
                      (k) =>
                        typeof k === "string" &&
                        (k.includes("organizations") || k.includes("members")),
                    ),
                });
                callbacksRef.current.onOrgMembersUpdated?.(
                  data.payload as RealtimeOrganizationMembersUpdatedPayload,
                );
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
  }, [enabled, userId, getWsUrl]);

  return {
    isConnected,
  };
}
