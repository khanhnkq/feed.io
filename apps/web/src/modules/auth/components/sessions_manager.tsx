"use client";

import React from "react";
import { Laptop, Loader2, ShieldCheck, Trash2 } from "lucide-react";
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
  CardBadge,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { FormError } from "./form_controls";

export function SessionsManager() {
  const queryClient = useQueryClient();
  const { data: sessionData, isLoading, error } = useListUserSessions();

  const revokeMutation = useRevokeUserSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUserSessionsQueryKey() });
      },
    },
  });

  if (isLoading) {
    return (
      <Card className="border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-center p-8 text-muted">
          <Loader2 className="animate-spin text-muted" size={22} />
        </div>
      </Card>
    );
  }

  if (error || !sessionData) {
    return (
      <Card className="border-line bg-surface p-6 shadow-sm">
        <FormError message="Failed to load active sessions. Please refresh or try again later." />
      </Card>
    );
  }

  const sessions = sessionData.items;

  return (
    <Card className="border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <CardBadge className="size-9 rounded-lg bg-lime font-mono text-xs font-bold text-ink">
              <Laptop size={17} />
            </CardBadge>
            <div>
              <CardTitle as="h4" className="mt-0 text-sm font-bold tracking-tight text-ink">
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs text-muted mt-0.5">
                Devices and browsers currently logged into your account.
              </CardDescription>
            </div>
          </div>
          <Badge variant="surface" size="md">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <CardContent className="mt-0">
          <div className="flex flex-col divide-y divide-line/60 border border-line rounded-lg overflow-hidden bg-paper">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface border border-line text-muted font-mono">
                    <Laptop size={15} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink truncate max-w-[280px]">
                        {session.user_agent || "Unknown Browser / Client"}
                      </span>
                      {session.current && (
                        <Badge variant="lime" size="sm" className="gap-1 font-bold shrink-0">
                          <ShieldCheck size={11} className="text-ink" />
                          Current Device
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted font-mono mt-0.5">
                      IP: {session.ip_address || "Unavailable"}
                    </span>
                  </div>
                </div>

                {!session.current && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revokeMutation.mutate({ sessionId: session.id })}
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
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
