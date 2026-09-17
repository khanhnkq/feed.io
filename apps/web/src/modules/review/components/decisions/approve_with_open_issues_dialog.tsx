"use client";

import React from "react";
import { Film } from "lucide-react";
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
          <Badge variant="surface" size="sm" className="shrink-0 font-mono">
            {openIssuesCount} Open {openIssuesCount === 1 ? "Issue" : "Issues"}
          </Badge>
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
