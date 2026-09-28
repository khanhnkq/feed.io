import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/modules/ui";
import { BillingOverview } from "../types";

interface ActiveSubscriptionCardProps {
  billing: BillingOverview | undefined;
  currentPlanName: string;
  currentPlanPrice: string;
  isFree: boolean;
  isCancelAtPeriodEnd: boolean;
  canManageBilling: boolean;
  onOpenUpgrade: (
    reason: "general" | "storage_limit" | "member_limit" | "pro_features",
  ) => void;
  onOpenCancel: () => void;
  onRenew: () => void;
  isRenewing: boolean;
  onResume: () => void;
  isResuming: boolean;
}

export function ActiveSubscriptionCard({
  billing,
  currentPlanName,
  currentPlanPrice,
  isFree,
  isCancelAtPeriodEnd,
  canManageBilling,
  onOpenUpgrade,
  onOpenCancel,
  onRenew,
  isRenewing,
  onResume,
  isResuming,
}: ActiveSubscriptionCardProps) {
  return (
    <Card className="border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
            Active Subscription
          </span>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl font-bold text-ink">{currentPlanName}</h2>
            <span className="text-sm font-semibold text-ink/80">{currentPlanPrice}</span>
            {billing?.billing_interval && (
              <Badge variant="surface" size="sm" className="capitalize">
                {billing.billing_interval} billing
              </Badge>
            )}
            {!isFree && (
              <Badge variant="surface" size="sm" className="text-muted text-[10px]">
                Manual renewal only
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          {isFree ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenUpgrade("general")}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Upgrade to Pro ($5/mo)</span>
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="rounded-lg border border-line bg-paper px-4 py-2.5 text-left sm:text-right">
                <span className="text-[11px] font-semibold text-muted block">
                  {isCancelAtPeriodEnd ? "Expires on" : "Current period ends"}
                </span>
                <span className="text-xs font-mono font-bold text-ink">
                  {billing?.current_period_end
                    ? new Date(billing.current_period_end).toLocaleDateString()
                    : "Continuous"}
                </span>
              </div>

              {canManageBilling && (
                <div className="flex items-center gap-2">
                  {isCancelAtPeriodEnd ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onResume}
                      disabled={isResuming}
                      className="gap-1.5"
                    >
                      {isResuming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      <span>Resume Plan</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={onRenew}
                        disabled={isRenewing}
                        className="gap-1.5"
                      >
                        {isRenewing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span>Renew Plan</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenCancel}
                        className="text-muted hover:text-danger hover:border-danger/40"
                      >
                        <span>Cancel Plan</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
