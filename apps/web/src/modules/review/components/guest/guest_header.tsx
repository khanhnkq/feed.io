"use client";

import { Download } from "lucide-react";
import React from "react";

import { Badge, Button } from "@/modules/ui";
import {
  REVIEW_DECISION_CONFIGS,
  ReviewDecisionDropdown,
  type ReviewStatus,
} from "../decisions/review_decision_dropdown";
import { ShareDetails } from "./guest_types";

export interface GuestHeaderProps {
  shareDetails: ShareDetails;
  currentReviewStatus: string;
  onDownloadAsset: () => void;
  guestName?: string;
  onGuestNameChange?: (name: string) => void;
  onGuestSubmitDecision?: (
    status: ReviewStatus,
    notes: string,
    guestName: string,
  ) => Promise<void> | void;
  onDecisionUpdated?: (status: ReviewStatus) => void;
}

export function GuestHeader({
  shareDetails,
  currentReviewStatus,
  onDownloadAsset,
  guestName,
  onGuestNameChange,
  onGuestSubmitDecision,
  onDecisionUpdated,
}: GuestHeaderProps) {
  const statusKey = (currentReviewStatus.toLowerCase() in REVIEW_DECISION_CONFIGS
    ? currentReviewStatus.toLowerCase()
    : "pending") as ReviewStatus;
  const currentConfig = REVIEW_DECISION_CONFIGS[statusKey];
  const StatusIcon = currentConfig.icon;

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-surface z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-[6px_2px] bg-lime font-black text-ink text-xs border border-ink/20 shadow-sm">
          F
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink tracking-tight">{shareDetails.title}</span>
          <Badge variant="outline" size="sm" className="text-[10px] py-0 text-muted">
            Guest Mode
          </Badge>
        </div>
      </div>

      {/* Action Controls in Header - All review decisions and status badges are on the right */}
      <div className="flex items-center gap-2">
        {shareDetails.allow_download && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-8 h-8 gap-1.5 text-xs"
            onClick={onDownloadAsset}
          >
            <Download size={13} className="text-ink" />
            <span>Download Master</span>
          </Button>
        )}

        {shareDetails.allow_approval ? (
          <div className="flex items-center gap-1.5 pl-2 border-l border-line">
            <ReviewDecisionDropdown
              isGuest
              currentStatus={currentReviewStatus}
              guestName={guestName}
              onGuestNameChange={onGuestNameChange}
              onGuestSubmitDecision={onGuestSubmitDecision}
              onDecisionUpdated={onDecisionUpdated}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 border-l border-line">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold ${currentConfig.bgClass}`}
              title="Review approvals are disabled for this share link"
            >
              <StatusIcon size={14} className={currentConfig.colorClass} />
              <span className={currentConfig.colorClass}>{currentConfig.label}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

