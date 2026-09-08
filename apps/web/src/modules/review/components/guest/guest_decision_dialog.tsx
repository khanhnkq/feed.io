"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
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

interface GuestDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  decisionStatus: "approved" | "needs_changes" | null;
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
  const isApproved = decisionStatus === "approved";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>
        <DialogCloseButton onClick={onClose} />
        <DialogTitle className="flex items-center gap-2">
          {isApproved ? (
            <>
              <ThumbsUp className="text-ink" size={18} />
              <span>Approve Media Asset</span>
            </>
          ) : (
            <>
              <ThumbsDown className="text-ink" size={18} />
              <span>Request Changes</span>
            </>
          )}
        </DialogTitle>
        <DialogDescription>
          Submit your formal review decision for <span className="font-semibold text-ink">{title}</span>.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted font-bold mb-1">
            Your Name
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
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={isApproved ? "primary" : "danger"}
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
