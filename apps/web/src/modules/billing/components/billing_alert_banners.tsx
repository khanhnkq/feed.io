import { AlertCircle, AlertTriangle, Clock, Loader2, RotateCcw } from "lucide-react";
import { Badge, Button } from "@/modules/ui";

interface CancellationAlertBannerProps {
  currentPeriodEnd: Date | null;
  canManageBilling: boolean;
  onResume: () => void;
  isResuming: boolean;
}

export function CancellationAlertBanner({
  currentPeriodEnd,
  canManageBilling,
  onResume,
  isResuming,
}: CancellationAlertBannerProps) {
  return (
    <section
      aria-label="Subscription cancellation notice"
      className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-danger/30 bg-danger/5 p-4 shadow-sm"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-danger/40 bg-paper text-danger">
          <AlertCircle size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-ink">
              Subscription Scheduled for Cancellation
            </span>
            <Badge variant="danger" size="sm">
              Ends on {currentPeriodEnd ? currentPeriodEnd.toLocaleDateString() : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
            You retain full access to your plan storage and features until the end date.
            After that, your workspace will automatically revert to the Free tier (5 GB).
          </p>
        </div>
      </div>
      {canManageBilling && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResume}
          disabled={isResuming}
          className="gap-1.5 shrink-0 self-start sm:self-auto"
        >
          {isResuming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          <span>Resume Subscription</span>
        </Button>
      )}
    </section>
  );
}

interface ExpiringSoonAlertBannerProps {
  daysRemaining: number;
  currentPeriodEnd: Date | null;
  canManageBilling: boolean;
  onRenew: () => void;
  isRenewing: boolean;
}

export function ExpiringSoonAlertBanner({
  daysRemaining,
  currentPeriodEnd,
  canManageBilling,
  onRenew,
  isRenewing,
}: ExpiringSoonAlertBannerProps) {
  return (
    <section
      aria-label="Subscription expiring reminder notice"
      className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-orange/40 bg-orange/5 p-4 shadow-sm"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-orange/50 bg-paper text-orange">
          <Clock size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-ink">
              Subscription Expiring Soon ({daysRemaining} days remaining)
            </span>
            <Badge variant="surface" size="sm">
              Manual renewal only
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
            Your subscription will end on{" "}
            <strong className="text-ink">
              {currentPeriodEnd ? currentPeriodEnd.toLocaleDateString() : ""}
            </strong>
            . Feedi does not automatically charge your card. Please renew manually to prevent storage interruptions.
          </p>
        </div>
      </div>
      {canManageBilling && (
        <Button
          variant="primary"
          size="sm"
          onClick={onRenew}
          disabled={isRenewing}
          className="gap-1.5 shrink-0 self-start sm:self-auto"
        >
          {isRenewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          <span>Renew Now</span>
        </Button>
      )}
    </section>
  );
}

export function PlatformPausedBanner() {
  return (
    <section
      aria-label="Platform test mode notice"
      className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-orange/40 bg-orange/5 p-4 shadow-sm"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-orange/50 bg-paper text-orange">
          <AlertTriangle size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-ink">
              Online Payments Temporarily Paused
            </span>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
            Platform administrators have temporarily paused checkout processing for dry-run
            testing. You can review plan specifications and storage quotas, but no card
            transactions will be initiated.
          </p>
        </div>
      </div>
    </section>
  );
}
