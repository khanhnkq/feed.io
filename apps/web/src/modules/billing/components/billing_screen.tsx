"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  HardDrive,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge, Button, Card, ProgressBar } from "@/modules/ui";
import {
  useCreatePortal,
  useOrganizationBilling,
  useResumeSubscription,
  useRenewSubscription,
} from "../hooks/use_billing";
import { UpgradeModal } from "./upgrade_modal";
import { InvoicesModal } from "./invoices_modal";
import { CancelModal } from "./cancel_modal";
import {
  CancellationAlertBanner,
  ExpiringSoonAlertBanner,
  PlatformPausedBanner,
} from "./billing_alert_banners";
import { ActiveSubscriptionCard } from "./active_subscription_card";

interface BillingScreenProps {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  currentUserRole?: "owner" | "admin" | "member";
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 GB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function BillingScreen({
  organizationId,
  organizationSlug,
  organizationName,
  currentUserRole = "owner",
}: BillingScreenProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<
    "member_limit" | "storage_limit" | "pro_features" | "general"
  >("general");

  const billingQuery = useOrganizationBilling(organizationId);
  const portalMutation = useCreatePortal(organizationId);
  const resumeMutation = useResumeSubscription(organizationId);
  const renewMutation = useRenewSubscription(organizationId);

  // If navigated with ?portal_session=..., auto-open the Invoices & Billing Portal modal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("portal_session")) {
        setIsInvoicesModalOpen(true);
      }
    }
  }, []);

  const canManageBilling =
    currentUserRole === "owner" || currentUserRole === "admin";

  const handleOpenUpgrade = (
    reason: "member_limit" | "storage_limit" | "pro_features" | "general",
  ) => {
    setModalReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleOpenPortal = async () => {
    try {
      const returnUrl = `${window.location.origin}/app/organizations/${organizationSlug}/billing`;
      const res = await portalMutation.mutateAsync({ return_url: returnUrl });
      if (res.portal_url) {
        if (
          res.portal_url.startsWith("https://billing.stripe.com") ||
          (res.portal_url.startsWith("http") &&
            !res.portal_url.includes(window.location.host))
        ) {
          window.location.href = res.portal_url;
          return;
        }
      }
      setIsInvoicesModalOpen(true);
    } catch (err) {
      console.error("Failed to open customer portal:", err);
      setIsInvoicesModalOpen(true);
    }
  };

  const handleRenew = async () => {
    try {
      const baseUrl = `${window.location.origin}/app/organizations/${organizationSlug}/billing`;
      const res = await renewMutation.mutateAsync({
        success_url: `${baseUrl}?renewal=success`,
        cancel_url: baseUrl,
      });
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        billingQuery.refetch();
      }
    } catch (err) {
      console.error("Failed to renew subscription:", err);
    }
  };

  const handleResume = async () => {
    try {
      await resumeMutation.mutateAsync();
      billingQuery.refetch();
    } catch (err) {
      console.error("Failed to resume subscription:", err);
    }
  };

  if (billingQuery.isPending) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
      >
        <div className="flex h-96 items-center justify-center text-sm text-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading billing details...</span>
        </div>
      </main>
    );
  }

  const billing = billingQuery.data;
  const planTier = billing?.plan_tier || "free";
  const isFree = planTier === "free";
  const isCancelAtPeriodEnd = billing?.cancel_at_period_end === true;
  const currentPeriodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end)
    : null;
  const now = new Date();
  const daysRemaining = currentPeriodEnd
    ? Math.ceil(
        (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpiringSoon =
    !isFree &&
    daysRemaining !== null &&
    daysRemaining <= 7 &&
    daysRemaining >= 0;

  const isNearLimit = (billing?.storage_usage_percentage ?? 0) >= 80;
  const isAtLimit = (billing?.storage_usage_percentage ?? 0) >= 95;

  const planDisplayNameMap: Record<string, string> = {
    free: "Free Workspace",
    pro_100gb: "Pro Hosted · 100 GB",
    pro_500gb: "Pro Hosted · 500 GB",
    pro_1tb: "Pro Hosted · 1 TB",
    enterprise: "Enterprise Custom",
  };

  const planPriceMap: Record<string, string> = {
    free: "$0",
    pro_100gb: "$5 / month",
    pro_500gb: "$15 / month",
    pro_1tb: "$27 / month",
    enterprise: "Custom",
  };

  const currentPlanName = planDisplayNameMap[planTier] || "Hosted Plan";
  const currentPlanPrice = planPriceMap[planTier] || "$0";

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Universal Organization Screen Header */}
      <section className="flex flex-col items-start gap-7 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em] text-ink">
              Billing &amp; Plans
            </h1>
            <Badge variant={isFree ? "surface" : "lime"} size="sm">
              {isFree ? "FREE TIER" : "PRO HOSTED"}
            </Badge>
          </div>
          <p className="mt-[18px] max-w-2xl text-[15px] leading-7 text-muted">
            Manage storage room, subscription renewals, and workspace quotas for{" "}
            <strong className="text-ink">{organizationName}</strong>.
          </p>
        </div>

        {canManageBilling && (
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {billing?.has_payment_method && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={portalMutation.isPending}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Manage in Stripe</span>
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenUpgrade("general")}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isFree ? "Upgrade to Pro" : "Change Storage Tier"}</span>
            </Button>
          </div>
        )}
      </section>

      {/* Subscription Canceled Banner */}
      {isCancelAtPeriodEnd && (
        <CancellationAlertBanner
          currentPeriodEnd={currentPeriodEnd}
          canManageBilling={canManageBilling}
          onResume={handleResume}
          isResuming={resumeMutation.isPending}
        />
      )}

      {/* Subscription Expiring Soon Warning (<= 7 days, No auto-renew) */}
      {!isCancelAtPeriodEnd && isExpiringSoon && (
        <ExpiringSoonAlertBanner
          daysRemaining={daysRemaining}
          currentPeriodEnd={currentPeriodEnd}
          canManageBilling={canManageBilling}
          onRenew={handleRenew}
          isRenewing={renewMutation.isPending}
        />
      )}

      {/* Platform Test Mode Banner */}
      {billing?.payments_enabled === false && <PlatformPausedBanner />}

      {/* Main Billing Sections (Clean, Non-repetitive) */}
      <div className="mt-8 space-y-6">
        {/* Section 1: Active Subscription Overview */}
        <ActiveSubscriptionCard
          billing={billing}
          currentPlanName={currentPlanName}
          currentPlanPrice={currentPlanPrice}
          isFree={isFree}
          isCancelAtPeriodEnd={isCancelAtPeriodEnd}
          canManageBilling={canManageBilling}
          onOpenUpgrade={handleOpenUpgrade}
          onOpenCancel={() => setIsCancelModalOpen(true)}
          onRenew={handleRenew}
          isRenewing={renewMutation.isPending}
          onResume={handleResume}
          isResuming={resumeMutation.isPending}
        />

        {/* Section 2: Quota & Usage Grid (Storage & Members) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Storage Meter Card */}
          <Card className="border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-ink" />
                <h3 className="text-sm font-bold text-ink">Storage Room</h3>
              </div>
              <span className="font-mono text-xs font-bold text-ink">
                {billing?.storage_usage_percentage ?? 0}%
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-mono text-2xl font-bold text-ink">
                  {formatBytes(billing?.storage_used_bytes ?? 0)}
                </span>
                <span className="font-mono text-xs text-muted">
                  of {formatBytes(billing?.storage_quota_bytes ?? 5368709120)}{" "}
                  allocated
                </span>
              </div>

              <ProgressBar
                value={billing?.storage_usage_percentage ?? 0}
                variant={isAtLimit ? "danger" : isNearLimit ? "ink" : "lime"}
                size="lg"
              />

              <p className="text-[11px] text-muted leading-relaxed">
                Includes original video files, converted proxy streams, and
                audio waveforms across all projects.
              </p>

              {isNearLimit && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-paper p-3 text-xs text-ink">
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-orange text-ink border border-ink/20 mt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-bold text-ink">Storage almost full</p>
                    <p className="text-[11px] text-muted">
                      You have used over 80% of your allocated room. Upgrade
                      your tier to avoid upload blocks.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenUpgrade("storage_limit")}
                      className="font-mono text-xs font-bold text-ink underline hover:text-focus mt-1 inline-block cursor-pointer"
                    >
                      Upgrade Storage Now &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Member Allocation Card */}
          <Card className="border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-ink" />
                <h3 className="text-sm font-bold text-ink">
                  Team &amp; Reviewers
                </h3>
              </div>
              {isFree ? (
                <Badge variant="surface">5 Seats Max</Badge>
              ) : (
                <Badge variant="lime">Unlimited Seats</Badge>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-ink">
                  {billing?.active_members_count ?? 1}
                </span>
                <span className="text-xs text-muted">
                  {isFree ? "of 5 members used" : "active team members"}
                </span>
              </div>

              {isFree ? (
                <div className="space-y-3">
                  <ProgressBar
                    value={((billing?.active_members_count ?? 1) / 5) * 100}
                    variant={
                      (billing?.active_members_count ?? 1) >= 5
                        ? "danger"
                        : "lime"
                    }
                    size="md"
                  />

                  {(billing?.active_members_count ?? 1) >= 5 ? (
                    <div className="rounded-lg border border-line bg-paper p-3 text-xs text-ink space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="danger" size="sm">
                          5/5 Reached
                        </Badge>
                        <span className="font-bold text-ink">
                          Free Member Limit Reached
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        Free workspaces are capped at five members. Upgrade to
                        any hosted tier ($5/mo) for unlimited team members and
                        reviewers.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenUpgrade("member_limit")}
                        className="font-mono text-xs font-bold text-ink underline hover:text-focus block cursor-pointer"
                      >
                        Unlock Unlimited Members &rarr;
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted">
                      Free workspaces are capped at 5 members. Paid plans unlock
                      unlimited members with zero per-seat fees.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-paper p-3.5 text-xs text-ink space-y-1">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span className="grid size-5 place-items-center rounded bg-lime text-ink border border-ink/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <span>Unlimited Members Active</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Invite editors, directors, clients, and external reviewers
                    without adding seat fees.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Section 3: Invoicing, Receipts & Card Details */}
        <Card className="border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-ink" />
                <h3 className="text-sm font-bold text-ink">
                  Invoicing &amp; Payment Methods
                </h3>
              </div>
              <p className="text-xs text-muted max-w-2xl leading-relaxed">
                {billing?.has_payment_method
                  ? "Your credit card and past invoices with VAT/Tax details are securely managed via Stripe."
                  : "No credit card is required while on the Free tier. Payment details will only be requested when upgrading."}
              </p>
            </div>

            {billing?.has_payment_method ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={portalMutation.isPending}
                className="gap-2 shrink-0 self-start sm:self-auto"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>View Invoices &amp; Receipts</span>
                <ExternalLink className="h-3 w-3 text-muted" />
              </Button>
            ) : (
              <Badge
                variant="surface"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
              >
                No Card Required
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Modals */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => { setIsUpgradeModalOpen(false); billingQuery.refetch(); }}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        currentPlanTier={planTier}
        reason={modalReason}
        paymentsEnabled={billing?.payments_enabled ?? true}
      />
      <InvoicesModal
        isOpen={isInvoicesModalOpen}
        onClose={() => setIsInvoicesModalOpen(false)}
        organizationName={organizationName}
        planName={currentPlanName}
        planPrice={currentPlanPrice}
      />
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => { setIsCancelModalOpen(false); billingQuery.refetch(); }}
        organizationId={organizationId}
        planName={currentPlanName}
        currentPeriodEnd={billing?.current_period_end ?? null}
      />
    </main>
  );
}
