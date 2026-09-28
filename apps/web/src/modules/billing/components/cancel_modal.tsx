"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { useCancelSubscription } from "../hooks/use_billing";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  planName: string;
  currentPeriodEnd: string | null;
}

export function CancelModal({
  isOpen,
  onClose,
  organizationId,
  planName,
  currentPeriodEnd,
}: CancelModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelMutation = useCancelSubscription(organizationId);

  const expirationDateStr = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString()
    : "end of current billing period";

  const handleConfirmCancel = async () => {
    setErrorMsg(null);
    try {
      await cancelMutation.mutateAsync({ immediate: false });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unable to cancel subscription right now. Please try again.",
      );
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      ariaLabelledBy="cancel-modal-title"
    >
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div>
            <DialogEyebrow>Subscription Management</DialogEyebrow>
            <DialogTitle id="cancel-modal-title">Cancel Subscription</DialogTitle>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        <DialogDescription>
          Are you sure you want to cancel your organization&apos;s subscription?
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4 py-2">
        <div className="rounded-xl border border-orange/40 bg-orange/5 p-4 flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-orange/50 bg-paper text-orange mt-0.5">
            <AlertTriangle size={16} />
          </div>
          <div className="text-xs space-y-1.5 text-ink leading-relaxed">
            <p className="font-bold text-sm">
              Full access retained until {expirationDateStr}
            </p>
            <p className="text-muted">
              All allocated storage room for <strong>{planName}</strong> and your uploaded
              media will remain active until the expiration date.
            </p>
            <p className="text-muted">
              After {expirationDateStr}, your workspace will automatically revert to{" "}
              <strong>Free (5 GB)</strong>. You will not be charged any renewal fees.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger font-medium">
            {errorMsg}
          </div>
        )}
      </DialogBody>

      <DialogFooter className="gap-2 sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={cancelMutation.isPending}
        >
          Keep Subscription
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleConfirmCancel}
          disabled={cancelMutation.isPending}
          className="gap-2"
        >
          {cancelMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span>Confirm Cancellation</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
