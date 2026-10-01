"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, Zap } from "lucide-react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";
import { STORAGE_TIERS } from "@/modules/landing/components/pricing_calculator";
import { useCreateCheckout, useTriggerMockUpgrade } from "../hooks/use_billing";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationSlug: string;
  currentPlanTier?: string;
  reason?: "member_limit" | "storage_limit" | "pro_features" | "general" | "organization_limit";
  paymentsEnabled?: boolean;
}

export function UpgradeModal({
  isOpen,
  onClose,
  organizationId,
  currentPlanTier = "free",
  reason = "general",
  paymentsEnabled = true,
}: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedTierId, setSelectedTierId] = useState<string>("pro_100gb");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkoutMutation = useCreateCheckout(organizationId);
  const mockUpgradeMutation = useTriggerMockUpgrade(organizationId);

  const selectedTier =
    STORAGE_TIERS.find((t) => t.id === selectedTierId) || STORAGE_TIERS[0];
  const isYearly = billingInterval === "yearly";

  const handleCheckout = async () => {
    setErrorMsg(null);
    setIsRedirecting(true);
    try {
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const baseUrl = currentUrl.split("?")[0];
      const res = await checkoutMutation.mutateAsync({
        plan_tier: selectedTier.id,
        billing_interval: billingInterval,
        success_url: `${baseUrl}?billing=success&tier=${selectedTier.id}`,
        cancel_url: `${baseUrl}?billing=canceled`,
      });

      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: unknown) {
      setIsRedirecting(false);
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(
        errorObj.response?.data?.detail ||
          "Failed to initialize checkout session. Please try again.",
      );
    }
  };

  const handleMockUpgrade = async () => {
    setErrorMsg(null);
    try {
      await mockUpgradeMutation.mutateAsync({
        event_type: "checkout.session.completed",
        organization_id: organizationId,
        plan_tier: selectedTier.id,
        billing_interval: billingInterval,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(
        errorObj.response?.data?.detail ||
          "Failed to trigger instant test upgrade.",
      );
    }
  };

  const getReasonEyebrow = () => {
    switch (reason) {
      case "member_limit":
        return "Member Limit Reached";
      case "storage_limit":
        return "Storage Quota Low";
      case "pro_features":
        return "Pro Feature Gated";
      case "organization_limit":
        return "Workspace Limit Reached";
      default:
        return "Upgrade Workspace";
    }
  };

  const getReasonTitle = () => {
    switch (reason) {
      case "member_limit":
        return "Unlock Unlimited Team Members";
      case "storage_limit":
        return "Add More Storage Room";
      case "pro_features":
        return "Upgrade to Access Pro Tools";
      case "organization_limit":
        return "Unlock Multiple Workspaces";
      default:
        return "Scale Your Feedi Studio";
    }
  };

  const getReasonDescription = () => {
    switch (reason) {
      case "member_limit":
        return "Free workspaces are capped at 5 members. Every paid plan unlocks unlimited team members, clients, and reviewers with zero per-seat fees.";
      case "storage_limit":
        return "You're approaching your workspace storage limit. Expand room seamlessly without deleting valuable original video cuts.";
      case "organization_limit":
        return "Free tier accounts are capped at owning 1 workspace. Upgrade your workspace to Pro ($5/mo) to create and own multiple organizations.";
      default:
        return "Storage-tiered plans with zero per-seat fees. Clients and reviewers never cost a seat.";
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      ariaLabelledBy="upgrade-modal-title"
    >
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div>
            <DialogEyebrow>{getReasonEyebrow()}</DialogEyebrow>
            <DialogTitle id="upgrade-modal-title">
              {getReasonTitle()}
            </DialogTitle>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        <DialogDescription>{getReasonDescription()}</DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        {!paymentsEnabled && (
          <div className="flex items-start gap-3 rounded-xl border border-orange/40 bg-orange/5 p-3.5 text-xs text-ink">
            <AlertTriangle className="size-4 shrink-0 text-orange mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <strong className="font-bold text-ink">
                  Payments Temporarily Disabled
                </strong>
                <span className="font-mono text-[10px] bg-paper px-1.5 py-0.5 rounded border border-line text-muted">
                  DRY RUN
                </span>
              </div>
              <p className="mt-1 text-muted leading-relaxed">
                Platform administrators have temporarily paused checkout
                processing for dry-run testing on production. No card charges or
                transactions will be processed at this time.
              </p>
            </div>
          </div>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-lg border border-line bg-surface p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                !isYearly
                  ? "bg-ink text-paper shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              Billed monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("yearly")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isYearly
                  ? "bg-ink text-paper shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span>Billed yearly</span>
              <span className="rounded bg-lime/20 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Tier Cards Selector */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STORAGE_TIERS.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            const isCurrent = currentPlanTier === tier.id;
            const price = isYearly
              ? tier.yearlyMonthlyEquivalent
              : tier.monthlyPrice;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-ink bg-surface shadow-md ring-2 ring-ink"
                    : "border-line bg-paper hover:border-ink/50"
                }`}
              >
                {tier.isPopular && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-ink">
                      {tier.storageLabel}
                    </span>
                    {isCurrent && (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                      ${price}
                    </span>
                    <span className="text-xs text-muted">/mo</span>
                  </div>

                  {isYearly && (
                    <div className="mt-0.5 text-[11px] text-muted">
                      ${tier.yearlyTotalPrice} billed yearly
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-line/60 pt-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      isSelected ? "text-ink" : "text-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 text-ink" />
                    <span>Unlimited seats</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feature inclusions checklist */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Included in all {selectedTier.storageLabel} hosted plans:
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 text-xs text-ink sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>
                <strong>Unlimited members & reviewers</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>NLE Marker Export (Premiere, FCPX, Resolve)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>Side-by-side & version compare</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>Passphrase-protected secure links</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-paper p-3 text-xs text-ink">
            <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              Error
            </span>
            <span>{errorMsg}</span>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
        {/* Instant test upgrade for dev / mock mode */}
        <button
          type="button"
          onClick={handleMockUpgrade}
          disabled={mockUpgradeMutation.isPending || isRedirecting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink underline decoration-dashed transition-colors"
        >
          <Zap className="h-3.5 w-3.5 text-ink" />
          <span>
            {mockUpgradeMutation.isPending
              ? "Applying..."
              : `Instant Dev Upgrade to ${selectedTier.storageLabel}`}
          </span>
        </button>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCheckout}
            disabled={
              !paymentsEnabled || isRedirecting || checkoutMutation.isPending
            }
            className="gap-2"
          >
            {isRedirecting || checkoutMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirecting...</span>
              </>
            ) : !paymentsEnabled ? (
              <span>Payments Disabled (Test Mode)</span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Get {selectedTier.storageLabel}</span>
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
