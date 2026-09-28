"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldAlert,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../ui";
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from "../../billing/hooks/use_billing";

export interface PlatformBillingCardProps {
  currentUserRole?: "super_admin" | "support" | string;
}

export function PlatformBillingCard({
  currentUserRole,
}: PlatformBillingCardProps) {
  const settingsQuery = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isSuperAdmin = currentUserRole === "super_admin";
  const paymentsEnabled = settingsQuery.data?.payments_enabled ?? true;
  const provider = settingsQuery.data?.billing_provider ?? "mock";

  const handleToggle = async (targetState: boolean) => {
    if (!isSuperAdmin) return;
    setFeedbackMsg(null);
    try {
      await updateMutation.mutateAsync({ payments_enabled: targetState });
      setFeedbackMsg({
        type: "success",
        text: targetState
          ? "Online payments have been enabled. Customers can upgrade plans normally."
          : "Payments have been paused. No card charges will occur.",
      });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setFeedbackMsg({
        type: "error",
        text:
          errorObj.response?.data?.detail ||
          "Failed to update platform payment settings. Please try again.",
      });
    }
  };

  return (
    <Card className="border-line bg-surface shadow-[0_2px_10px_rgba(20,21,18,0.02)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle as="h2" className="mt-1.5 text-lg font-bold text-ink">
              Manage platform-wide payment processing and checkout sessions.
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start shrink-0">
          <Badge
            variant="surface"
            size="sm"
            className="font-mono text-[11px] text-muted border-line"
          >
            Gateway: {provider.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Status Callout Box */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
            paymentsEnabled
              ? "border-line bg-paper"
              : "border-orange/40 bg-orange/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-lg border ${
                paymentsEnabled
                  ? "border-line bg-surface text-ink"
                  : "border-orange/50 bg-paper text-orange"
              }`}
            >
              {paymentsEnabled ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">
                  {paymentsEnabled
                    ? "Payment gate is operational and accepting checkouts"
                    : "Test Mode Active: All payments globally disabled"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted leading-relaxed max-w-xl">
                {paymentsEnabled
                  ? "Customers can initiate Stripe checkouts and upgrade workspace storage quotas seamlessly."
                  : "Organization billing pages show a Test Mode dry-run notice, and checkout buttons are temporarily disabled. No fees or charges will be incurred."}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {paymentsEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(false)}
                disabled={
                  !isSuperAdmin ||
                  updateMutation.isPending ||
                  settingsQuery.isLoading
                }
                className="gap-2 border-line text-ink hover:bg-paper"
              >
                {updateMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Lock size={14} className="text-muted" />
                )}
                <span>Pause Payments</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleToggle(true)}
                disabled={
                  !isSuperAdmin ||
                  updateMutation.isPending ||
                  settingsQuery.isLoading
                }
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                <span>Enable Live Payments</span>
              </Button>
            )}
          </div>
        </div>

        {/* Permission Note */}
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3.5 py-2 text-xs text-muted">
            <ShieldAlert size={14} className="text-orange shrink-0" />
            <span>
              Your current role is{" "}
              <strong>{currentUserRole || "support"}</strong>. Only{" "}
              <strong>Super Admins</strong> hold permission to toggle
              platform-wide payment processing.
            </span>
          </div>
        )}

        {/* Feedback Message */}
        {feedbackMsg && (
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs animate-in fade-in-50 duration-200 ${
              feedbackMsg.type === "success"
                ? "border-line bg-surface text-ink"
                : "border-warning bg-warning/10 text-warning"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 size={15} className="text-ink shrink-0" />
            ) : (
              <AlertTriangle size={15} className="text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Architecture details footer */}
      </CardContent>
    </Card>
  );
}
