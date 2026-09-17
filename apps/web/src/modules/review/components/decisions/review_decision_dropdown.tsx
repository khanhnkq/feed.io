"use client";

import {
  useCreateMediaDecision,
  useListMediaComments,
  useListMediaDecisions,
  useUpdateComment,
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
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { ApproveWithOpenIssuesDialog } from "./approve_with_open_issues_dialog";

export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "needs_changes"
  | "approved";

export interface ReviewDecisionConfig {
  label: string;
  badgeVariant: BadgeVariant;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  colorClass: string;
  bgClass: string;
  hoverClass: string;
  description: string;
}

export const REVIEW_DECISION_CONFIGS: Record<
  ReviewStatus,
  ReviewDecisionConfig
> = {
  approved: {
    label: "Approved",
    badgeVariant: "success",
    icon: CheckCircle2,
    colorClass: "text-ink",
    bgClass: "bg-lime/20 border-lime/60",
    hoverClass: "hover:bg-lime/30 hover:border-ink",
    description: "Asset is approved for final delivery.",
  },
  needs_changes: {
    label: "Needs Changes",
    badgeVariant: "danger",
    icon: AlertCircle,
    colorClass: "text-red-700",
    bgClass: "bg-red-50 border-red-200",
    hoverClass: "hover:bg-red-100/80 hover:border-red-400",
    description: "Revisions requested before approval.",
  },
  in_progress: {
    label: "In Progress",
    badgeVariant: "outline",
    icon: Clock,
    colorClass: "text-ink",
    bgClass: "bg-paper border-line",
    hoverClass: "hover:bg-surface hover:border-ink",
    description: "Creative work or edits in progress.",
  },
  pending: {
    label: "Pending Review",
    badgeVariant: "surface",
    icon: CircleDashed,
    colorClass: "text-muted",
    bgClass: "bg-surface border-line",
    hoverClass: "hover:bg-paper hover:border-ink",
    description: "Awaiting review and decision.",
  },
};

export interface ReviewDecisionDropdownProps {
  organizationId?: string;
  projectId?: string;
  mediaId?: string;
  mediaTitle?: string;
  currentStatus?: string;
  onDecisionUpdated?: (status: ReviewStatus) => void;
  disabled?: boolean;
  isGuest?: boolean;
  guestName?: string;
  onGuestNameChange?: (name: string) => void;
  onGuestSubmitDecision?: (
    status: ReviewStatus,
    notes: string,
    guestName: string,
  ) => Promise<void> | void;
  allowedStatuses?: ReviewStatus[];
}

export function ReviewDecisionDropdown({
  organizationId,
  projectId,
  mediaId,
  mediaTitle,
  currentStatus = "pending",
  onDecisionUpdated,
  disabled = false,
  isGuest = false,
  guestName = "",
  onGuestNameChange,
  onGuestSubmitDecision,
  allowedStatuses,
}: ReviewDecisionDropdownProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isResolvingIssues, setIsResolvingIssues] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [localGuestName, setLocalGuestName] = useState(guestName);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const commentsQuery = useListMediaComments(
    organizationId || "",
    projectId || "",
    mediaId || "",
    {
      query: {
        enabled: Boolean(!isGuest && organizationId && projectId && mediaId),
      },
    },
  );
  const openComments = useMemo(() => {
    const list = commentsQuery.data || [];
    return list.filter((c) => (c.status || "open") === "open");
  }, [commentsQuery.data]);

  const updateCommentMutation = useUpdateComment();

  useEffect(() => {
    if (guestName) setLocalGuestName(guestName);
  }, [guestName]);

  const statusKey = (
    currentStatus.toLowerCase() in REVIEW_DECISION_CONFIGS
      ? currentStatus.toLowerCase()
      : "pending"
  ) as ReviewStatus;

  const currentConfig = REVIEW_DECISION_CONFIGS[statusKey];
  const CurrentIcon = currentConfig.icon;

  const createDecisionMutation = useCreateMediaDecision();
  const { data: decisionsData } = useListMediaDecisions(
    organizationId || "",
    projectId || "",
    mediaId || "",
    {
      query: {
        enabled: Boolean(!isGuest && organizationId && projectId && mediaId),
      },
    },
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
    if (status === "approved" && openComments.length > 0) {
      setIsWarningOpen(true);
      return;
    }
    setIsNoteDialogOpen(true);
  };

  const handleResolveAllAndApprove = async () => {
    if (!organizationId || !projectId || !mediaId) return;
    try {
      setIsResolvingIssues(true);
      await Promise.all(
        openComments.map((c) =>
          updateCommentMutation.mutateAsync({
            organizationId,
            projectId,
            mediaId,
            commentId: c.id,
            data: { status: "resolved" },
          }),
        ),
      );
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) =>
              typeof k === "string" &&
              (k.includes("comment") || k.includes("issue")),
          ),
      });
      setIsWarningOpen(false);
      setIsNoteDialogOpen(true);
    } finally {
      setIsResolvingIssues(false);
    }
  };

  const isPending = isGuest
    ? isGuestSubmitting
    : createDecisionMutation.isPending;

  const handleConfirmDecision = async () => {
    if (!selectedStatus) return;

    if (isGuest) {
      const trimmedName = localGuestName.trim();
      if (!trimmedName) return;

      if (typeof window !== "undefined") {
        localStorage.setItem("feedio_guest_name", trimmedName);
      }
      onGuestNameChange?.(trimmedName);

      try {
        setIsGuestSubmitting(true);
        await onGuestSubmitDecision?.(
          selectedStatus,
          notes.trim(),
          trimmedName,
        );
        onDecisionUpdated?.(selectedStatus);
        setIsNoteDialogOpen(false);
        setNotes("");
        setSelectedStatus(null);
      } finally {
        setIsGuestSubmitting(false);
      }
      return;
    }

    if (!organizationId || !projectId || !mediaId) return;

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
  const statusesToShow =
    allowedStatuses || (Object.keys(REVIEW_DECISION_CONFIGS) as ReviewStatus[]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Main Status Button Trigger */}
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`inline-flex min-h-9 h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-bold shadow-xs transition duration-150 focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${currentConfig.bgClass} ${currentConfig.hoverClass}`}
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
          <div className="space-y-1">
            {statusesToShow.map((status) => {
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
                  <Icon
                    size={16}
                    className={`mt-0.5 shrink-0 ${config.colorClass}`}
                  />
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
                  {latestDecision.guest_name ||
                    latestDecision.user_name ||
                    "Team member"}
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
      <Dialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
      >
        <DialogHeader>
          <DialogTitle>
            Update Review Status to{" "}
            {selectedStatus && REVIEW_DECISION_CONFIGS[selectedStatus].label}
          </DialogTitle>
          <DialogCloseButton onClick={() => setIsNoteDialogOpen(false)} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          <DialogDescription>
            Provide optional feedback, review notes, or instructions for the
            team.
          </DialogDescription>

          {isGuest && (
            <div className="space-y-1.5">
              <label
                htmlFor="guest-reviewer-name-input"
                className="flex items-center gap-1.5 font-mono text-xs font-bold text-ink"
              >
                Your Name (Required)
              </label>
              <input
                id="guest-reviewer-name-input"
                type="text"
                required
                value={localGuestName}
                onChange={(e) => setLocalGuestName(e.target.value)}
                placeholder="e.g., Alex Reviewer"
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
          )}

          <div className="space-y-1.5">
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
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmDecision}
            disabled={isPending || (isGuest && !localGuestName.trim())}
            className="flex items-center gap-1.5"
          >
            {isPending ? (
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

      <ApproveWithOpenIssuesDialog
        isOpen={isWarningOpen}
        onClose={() => {
          setIsWarningOpen(false);
          setSelectedStatus(null);
        }}
        mediaTitle={mediaTitle}
        openIssuesCount={openComments.length}
        onApproveAnyway={() => {
          setIsWarningOpen(false);
          setIsNoteDialogOpen(true);
        }}
        onResolveAllAndApprove={handleResolveAllAndApprove}
        isPending={isResolvingIssues}
      />
    </div>
  );
}
