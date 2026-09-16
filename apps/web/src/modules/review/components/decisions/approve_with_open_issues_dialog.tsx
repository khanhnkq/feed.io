"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Film } from "lucide-react";
import { Badge } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/components/dialog";

export interface ApproveWithOpenIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mediaTitle?: string;
  openIssuesCount: number;
  onApproveAnyway: () => void | Promise<void>;
  onResolveAllAndApprove?: () => void | Promise<void>;
  isPending?: boolean;
}

export function ApproveWithOpenIssuesDialog({
  isOpen,
  onClose,
  mediaTitle = "Media Asset",
  openIssuesCount,
  onApproveAnyway,
  onResolveAllAndApprove,
  isPending = false,
}: ApproveWithOpenIssuesDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      ariaLabelledBy="approve-issues-dialog-title"
      ariaDescribedBy="approve-issues-dialog-desc"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Approval Warning</DialogEyebrow>
          <DialogCloseButton onClick={onClose} disabled={isPending} />
        </div>
        <DialogTitle id="approve-issues-dialog-title">
          Approve with Open Issues?
        </DialogTitle>
        <DialogDescription id="approve-issues-dialog-desc">
          This media asset has active feedback items that have not been marked as resolved.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Asset Target Overview */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted">
              <Film className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Asset Target
              </span>
              <p className="truncate text-sm font-bold text-ink" title={mediaTitle}>
                {mediaTitle}
              </p>
            </div>
          </div>
          <Badge variant="surface" size="sm" dot className="shrink-0 font-mono">
            {openIssuesCount} Open {openIssuesCount === 1 ? "Issue" : "Issues"}
          </Badge>
        </div>

        {/* Resolution Options Breakdown */}
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
            Resolution Options
          </span>

          <div className="space-y-2">
            {onResolveAllAndApprove && (
              <div className="flex items-start gap-3 rounded-lg border border-line bg-paper p-3 text-xs">
                <CheckCircle2 className="size-4 shrink-0 text-muted mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-ink">Resolve All & Approve</span>
                  <p className="text-muted leading-relaxed">
                    Automatically marks all {openIssuesCount} open {openIssuesCount === 1 ? "issue" : "issues"} as resolved and approves the media asset.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-line bg-paper p-3 text-xs">
              <AlertCircle className="size-4 shrink-0 text-muted mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-ink">Approve Anyway</span>
                <p className="text-muted leading-relaxed">
                  Proceeds with approval while preserving open issues for team reference and follow-up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="!flex-nowrap items-center justify-end gap-2 sm:gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          className="shrink-0 whitespace-nowrap"
        >
          Review Issues
        </Button>
        {onResolveAllAndApprove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResolveAllAndApprove}
            disabled={isPending}
            className="shrink-0 whitespace-nowrap"
          >
            Resolve All & Approve
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onApproveAnyway}
          disabled={isPending}
          className="shrink-0 whitespace-nowrap"
        >
          Approve Anyway
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
