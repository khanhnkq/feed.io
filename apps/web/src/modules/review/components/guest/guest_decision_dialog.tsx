"use client";

import React from "react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";
import {
  REVIEW_DECISION_CONFIGS,
  type ReviewStatus,
} from "../decisions/review_decision_dropdown";

interface GuestDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  decisionStatus: ReviewStatus | null;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  decisionNote: string;
  onDecisionNoteChange: (note: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function GuestDecisionDialog({
  isOpen,
  onClose,
  title,
  decisionStatus,
  guestName,
  onGuestNameChange,
  decisionNote,
  onDecisionNoteChange,
  isSubmitting,
  onSubmit,
}: GuestDecisionDialogProps) {
  const config = decisionStatus ? REVIEW_DECISION_CONFIGS[decisionStatus] : null;
  const StatusIcon = config?.icon;

  const getDialogTitle = () => {
    switch (decisionStatus) {
      case "approved":
        return "Approve Media Asset";
      case "needs_changes":
        return "Request Changes";
      case "in_progress":
        return "Mark Asset In Progress";
      case "pending":
        return "Reset to Pending Review";
      default:
        return "Submit Review Decision";
    }
  };

  const getButtonVariant = () => {
    switch (decisionStatus) {
      case "approved":
        return "primary";
      case "needs_changes":
        return "danger";
      default:
        return "primary";
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>
        <DialogCloseButton onClick={onClose} />
        <DialogTitle className="flex items-center gap-2">
          {StatusIcon && <StatusIcon size={18} className={config?.colorClass} />}
          <span>{getDialogTitle()}</span>
        </DialogTitle>
        <DialogDescription>
          Submit review decision ({config?.label || "Decision"}) for{" "}
          <span className="font-semibold text-ink">{title}</span>.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted font-bold mb-1">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Alice Client"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted font-bold mb-1">
            Optional Review Notes
          </label>
          <textarea
            rows={3}
            placeholder="Add details or context for the team..."
            value={decisionNote}
            onChange={(e) => onDecisionNoteChange(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink focus:border-ink focus:outline-none resize-none"
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={getButtonVariant()}
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting || !guestName.trim()}
        >
          {isSubmitting ? "Submitting..." : "Submit Review Decision"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
