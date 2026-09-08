"use client";

import { Download, ThumbsDown, ThumbsUp } from "lucide-react";
import React from "react";

import { Badge, Button } from "@/modules/ui";
import { ShareDetails } from "./guest_types";

interface GuestHeaderProps {
  shareDetails: ShareDetails;
  currentReviewStatus: string;
  onDownloadAsset: () => void;
  onOpenDecisionModal: (status: "approved" | "needs_changes") => void;
}

export function GuestHeader({
  shareDetails,
  currentReviewStatus,
  onDownloadAsset,
  onOpenDecisionModal,
}: GuestHeaderProps) {
  const statusVariant =
    currentReviewStatus === "approved"
      ? "success"
      : currentReviewStatus === "needs_changes"
      ? "danger"
      : "surface";

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-surface z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-[6px_2px] bg-lime font-black text-ink text-xs border border-ink/20 shadow-sm">
          F
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink tracking-tight">{shareDetails.title}</span>
            <Badge variant="outline" size="sm" className="text-[10px] py-0 text-muted">
              Guest Mode
            </Badge>
            <Badge variant={statusVariant} size="sm" className="text-[10px] py-0 uppercase font-bold">
              {currentReviewStatus.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Controls in Header */}
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

        {shareDetails.allow_approval && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-line">
            <Button
              variant="primary"
              size="sm"
              className="min-h-8 h-8 gap-1 text-xs"
              onClick={() => onOpenDecisionModal("approved")}
            >
              <ThumbsUp size={13} className="text-white" />
              <span>Approve</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-8 h-8 gap-1 text-xs"
              onClick={() => onOpenDecisionModal("needs_changes")}
            >
              <ThumbsDown size={13} className="text-ink" />
              <span>Request Changes</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
