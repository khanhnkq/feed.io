"use client";

import {
  useCreateMediaDecision,
  useListMediaDecisions,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  Loader2,
  MessageSquare,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { BadgeVariant } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/components/dialog";

export type ReviewStatus = "pending" | "in_progress" | "needs_changes" | "approved";

export interface ReviewDecisionConfig {
  label: string;
  badgeVariant: BadgeVariant;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  colorClass: string;
  bgClass: string;
  description: string;
}

export const REVIEW_DECISION_CONFIGS: Record<ReviewStatus, ReviewDecisionConfig> = {
  approved: {
    label: "Approved",
    badgeVariant: "success",
    icon: CheckCircle2,
    colorClass: "text-ink",
    bgClass: "bg-lime/20 border-lime/60",
    description: "Asset is approved for final delivery.",
  },
  needs_changes: {
    label: "Needs Changes",
    badgeVariant: "danger",
    icon: AlertCircle,
    colorClass: "text-red-700",
    bgClass: "bg-red-50 border-red-200",
    description: "Revisions requested before approval.",
  },
  in_progress: {
    label: "In Progress",
    badgeVariant: "outline",
    icon: Clock,
    colorClass: "text-ink",
    bgClass: "bg-paper border-line",
    description: "Creative work or edits in progress.",
  },
  pending: {
    label: "Pending Review",
    badgeVariant: "surface",
    icon: CircleDashed,
    colorClass: "text-muted",
    bgClass: "bg-surface border-line",
    description: "Awaiting review and decision.",
  },
};

export interface ReviewDecisionDropdownProps {
  organizationId: string;
  projectId: string;
  mediaId: string;
  currentStatus?: string;
  onDecisionUpdated?: (status: ReviewStatus) => void;
  disabled?: boolean;
}

export function ReviewDecisionDropdown({
  organizationId,
  projectId,
  mediaId,
  currentStatus = "pending",
  onDecisionUpdated,
  disabled = false,
}: ReviewDecisionDropdownProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(null);
  const [notes, setNotes] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusKey = (currentStatus.toLowerCase() in REVIEW_DECISION_CONFIGS
    ? currentStatus.toLowerCase()
    : "pending") as ReviewStatus;

  const currentConfig = REVIEW_DECISION_CONFIGS[statusKey];
  const CurrentIcon = currentConfig.icon;

  const createDecisionMutation = useCreateMediaDecision();
  const { data: decisionsData } = useListMediaDecisions(
    organizationId,
    projectId,
    mediaId,
    {
      query: {
        enabled: Boolean(organizationId && projectId && mediaId),
      },
    },
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectStatus = (status: ReviewStatus) => {
    setSelectedStatus(status);
    setIsOpen(false);
    setIsNoteDialogOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedStatus) return;

    try {
      await createDecisionMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId,
        data: {
          status: selectedStatus,
          notes: notes.trim() || undefined,
        },
      });

      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (k) =>
              typeof k === "string" &&
              (k.includes("media") || k.includes("decisions")),
          ),
      });

      onDecisionUpdated?.(selectedStatus);
      setIsNoteDialogOpen(false);
      setNotes("");
      setSelectedStatus(null);
    } catch {
      // Error handled by queryClient/mutation state
    }
  };

  const latestDecision = decisionsData?.items?.[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Main Status Button Trigger */}
      <button
        type="button"
        disabled={disabled || createDecisionMutation.isPending}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition duration-150 focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1 disabled:opacity-50 ${currentConfig.bgClass}`}
      >
        <CurrentIcon size={14} className={currentConfig.colorClass} />
        <span className={currentConfig.colorClass}>{currentConfig.label}</span>
        <ChevronDown
          size={12}
          className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-xl focus:outline-none animate-in fade-in zoom-in-95">
          <div className="px-2 py-1.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
              Change Decision
            </p>
          </div>

          <div className="space-y-1">
            {(Object.keys(REVIEW_DECISION_CONFIGS) as ReviewStatus[]).map((status) => {
              const config = REVIEW_DECISION_CONFIGS[status];
              const Icon = config.icon;
              const isSelected = status === statusKey;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition duration-150 ${
                    isSelected
                      ? "bg-paper font-bold text-ink"
                      : "text-ink/80 hover:bg-paper/70 hover:text-ink"
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${config.colorClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{config.label}</span>
                      {isSelected && <Check size={12} className="text-ink" />}
                    </div>
                    <p className="text-[11px] text-muted leading-tight mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* History Footer */}
          {latestDecision && (
            <div className="mt-2 border-t border-line pt-2 px-2 pb-1">
              <p className="font-mono text-[10px] text-muted truncate">
                Last updated by{" "}
                <span className="font-bold text-ink">
                  {latestDecision.user_name || "Team member"}
                </span>
              </p>
              {latestDecision.notes && (
                <p className="mt-0.5 line-clamp-2 text-[10px] italic text-muted/80">
                  &ldquo;{latestDecision.notes}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Note & Confirm Dialog */}
      <Dialog isOpen={isNoteDialogOpen} onClose={() => setIsNoteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            Update Review Status to {selectedStatus && REVIEW_DECISION_CONFIGS[selectedStatus].label}
          </DialogTitle>
          <DialogCloseButton onClick={() => setIsNoteDialogOpen(false)} />
        </DialogHeader>

        <DialogBody>
          <DialogDescription>
            Provide optional feedback, review notes, or instructions for the team.
          </DialogDescription>

          <div className="mt-4 space-y-2">
            <label
              htmlFor="review-notes-input"
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-ink"
            >
              <MessageSquare size={14} className="text-muted" />
              Review Notes (Optional)
            </label>
            <textarea
              id="review-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Color grading approved. Please adjust sound mix at 00:02:15."
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsNoteDialogOpen(false)}
            disabled={createDecisionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmDecision}
            disabled={createDecisionMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {createDecisionMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={14} />
                Confirm Decision
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
