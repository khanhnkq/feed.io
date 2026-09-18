"use client";

import React from "react";
import {
  Laptop,
  Loader2,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import {
  useListUserSessions,
  useRevokeUserSession,
  getListUserSessionsQueryKey,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { FormError } from "./form_controls";

interface ParsedDeviceInfo {
  deviceType: "phone" | "tablet" | "desktop";
  label: string;
  os: string;
}

function parseUserAgent(ua?: string | null): ParsedDeviceInfo {
  if (!ua) {
    return {
      deviceType: "desktop",
      label: "Unknown Browser / Client",
      os: "Unknown",
    };
  }

  const lower = ua.toLowerCase();

  let deviceType: "phone" | "tablet" | "desktop" = "desktop";
  let os = "Desktop";

  if (
    lower.includes("ipad") ||
    (lower.includes("tablet") && !lower.includes("mobile"))
  ) {
    deviceType = "tablet";
    os = "iPad";
  } else if (lower.includes("iphone")) {
    deviceType = "phone";
    os = "iPhone";
  } else if (lower.includes("android")) {
    if (lower.includes("mobile")) {
      deviceType = "phone";
      os = "Android";
    } else {
      deviceType = "tablet";
      os = "Android Tablet";
    }
  } else if (lower.includes("macintosh") || lower.includes("mac os")) {
    deviceType = "desktop";
    os = "macOS";
  } else if (lower.includes("windows")) {
    deviceType = "desktop";
    os = "Windows";
  } else if (lower.includes("linux")) {
    deviceType = "desktop";
    os = "Linux";
  }

  let browser = "Browser";
  if (lower.includes("edg/")) {
    browser = "Edge";
  } else if (lower.includes("chrome/") && !lower.includes("chromium")) {
    browser = "Chrome";
  } else if (lower.includes("safari/") && !lower.includes("chrome")) {
    browser = "Safari";
  } else if (lower.includes("firefox/")) {
    browser = "Firefox";
  } else if (lower.includes("opr/") || lower.includes("opera/")) {
    browser = "Opera";
  }

  return {
    deviceType,
    os,
    label: `${browser} on ${os}`,
  };
}

function DeviceIcon({ type }: { type: "phone" | "tablet" | "desktop" }) {
  if (type === "phone") {
    return <Smartphone size={15} />;
  }
  if (type === "tablet") {
    return <Tablet size={15} />;
  }
  return <Laptop size={15} />;
}

export function SessionsManager() {
  const queryClient = useQueryClient();
  const { data: sessionData, isLoading, error } = useListUserSessions();

  const revokeMutation = useRevokeUserSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListUserSessionsQueryKey(),
        });
      },
    },
  });

  if (isLoading) {
    return (
      <Card className="border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle
                as="h4"
                className="mt-0 text-base font-bold tracking-tight text-ink"
              >
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs text-muted mt-0.5">
                Devices and browsers currently logged into your account.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="flex items-center justify-center p-8 text-muted">
            <Loader2 className="animate-spin text-muted" size={22} />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !sessionData) {
    return (
      <Card className="border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle
                as="h4"
                className="mt-0 text-base font-bold tracking-tight text-ink"
              >
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs text-muted mt-0.5">
                Devices and browsers currently logged into your account.
              </CardDescription>
            </div>
          </CardHeader>
          <FormError message="Failed to load active sessions. Please refresh or try again later." />
        </div>
      </Card>
    );
  }

  const sessions = sessionData.items;

  return (
    <Card className="border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle
              as="h4"
              className="mt-0 text-base font-bold tracking-tight text-ink"
            >
              Active Sessions
            </CardTitle>
            <CardDescription className="text-xs text-muted mt-0.5">
              Devices and browsers currently logged into your account.
            </CardDescription>
          </div>
          <Badge variant="surface" size="md">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <div className="flex flex-col divide-y divide-line/60 border border-line rounded-lg overflow-hidden bg-paper">
          {sessions.map((session) => {
            const info = parseUserAgent(session.user_agent);

            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-md bg-surface border border-line text-ink font-mono"
                    title={info.os}
                  >
                    <DeviceIcon type={info.deviceType} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink truncate max-w-[280px]">
                        {info.label}
                      </span>

                      {session.current && (
                        <Badge
                          variant="lime"
                          size="sm"
                          className="gap-1 font-bold shrink-0"
                        >
                          <ShieldCheck size={11} className="text-ink" />
                          Current Device
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted font-mono mt-0.5">
                      <span>IP: {session.ip_address || "Unavailable"}</span>
                      <span className="text-line">•</span>
                      <span
                        className="truncate max-w-[220px]"
                        title={session.user_agent || undefined}
                      >
                        {session.user_agent || "Web client"}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.current && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      revokeMutation.mutate({ sessionId: session.id })
                    }
                    disabled={revokeMutation.isPending}
                    pending={
                      revokeMutation.isPending &&
                      revokeMutation.variables?.sessionId === session.id
                    }
                    className="text-red-700 border-line hover:border-red-300 hover:bg-red-50 hover:text-red-800 text-xs shrink-0"
                    title="Revoke session"
                  >
                    <Trash2 size={13} />
                    <span>Revoke</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
