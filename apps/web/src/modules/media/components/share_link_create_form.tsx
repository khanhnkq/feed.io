"use client";

import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "../../ui";

interface ShareLinkCreateFormProps {
  createdUrl: string | null;
  onResetCreatedUrl: () => void;
  onViewActiveLinks: () => void;
  expiryDays: number;
  onExpiryDaysChange: (days: number) => void;
  enablePassphrase: boolean;
  onEnablePassphraseChange: (enabled: boolean) => void;
  passphrase: string;
  onPassphraseChange: (pass: string) => void;
  allowComments: boolean;
  onAllowCommentsChange: (allow: boolean) => void;
  allowApproval: boolean;
  onAllowApprovalChange: (allow: boolean) => void;
  allowDownload: boolean;
  onAllowDownloadChange: (allow: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

export function ShareLinkCreateForm({
  createdUrl,
  onResetCreatedUrl,
  onViewActiveLinks,
  expiryDays,
  onExpiryDaysChange,
  enablePassphrase,
  onEnablePassphraseChange,
  passphrase,
  onPassphraseChange,
  allowComments,
  onAllowCommentsChange,
  allowApproval,
  onAllowApprovalChange,
  allowDownload,
  onAllowDownloadChange,
  isSubmitting,
  onSubmit,
  copiedId,
  onCopy,
}: ShareLinkCreateFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (createdUrl) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3 shadow-[3px_3px_0_#11130f]">
        <div className="flex items-center gap-2 text-ink text-xs font-bold uppercase tracking-wider">
          <Check size={16} className="text-ink" />
          <span>Share Link Created Successfully</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={createdUrl}
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2 text-xs font-mono text-ink selection:bg-lime selection:text-ink focus:outline-none"
          />
          <Button
            variant={copiedId === "newly-created" ? "primary" : "outline"}
            size="sm"
            onClick={() => onCopy(createdUrl, "newly-created")}
          >
            {copiedId === "newly-created" ? (
              <Check size={14} className="text-white" />
            ) : (
              <Copy size={14} className="text-ink" />
            )}
            <span>{copiedId === "newly-created" ? "Copied" : "Copy"}</span>
          </Button>
        </div>
        <p className="text-[11px] text-muted">
          Guests accessing this link will have frame-accurate review access
          according to the configured permissions.
        </p>
        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={onResetCreatedUrl}>
            Create Another Link
          </Button>
          <Button variant="ghost" size="sm" onClick={onViewActiveLinks}>
            View Active Links
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* 1. Link Expiration Section (Mandatory Expiration: 24h, 3d, 7d, 30d) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Link Expiration
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "24 Hours", value: 1 },
            { label: "3 Days", value: 3 },
            { label: "7 Days", value: 7 },
            { label: "30 Days", value: 30 },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onExpiryDaysChange(opt.value)}
              className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                expiryDays === opt.value
                  ? "border-ink bg-lime text-ink font-bold shadow-[2px_2px_0_#11130f]"
                  : "border-line bg-surface/60 text-muted hover:border-line hover:text-ink hover:bg-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Security & Access Protection Section */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Access Protection
        </div>
        <div className="rounded-xl border border-line bg-surface/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-ink" />
              <div>
                <div className="text-xs font-medium text-ink">
                  Require Passphrase
                </div>
                <div className="text-[11px] text-muted">
                  External guests must enter a password to view or comment
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enablePassphrase}
              onChange={(e) => onEnablePassphraseChange(e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink focus:ring-lime cursor-pointer accent-lime"
            />
          </div>

          {enablePassphrase && (
            <div className="pt-1.5 relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter secure passphrase..."
                value={passphrase}
                onChange={(e) => onPassphraseChange(e.target.value)}
                required={enablePassphrase}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2 text-xs text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-muted hover:text-ink transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={14} className="text-ink" />
                ) : (
                  <Eye size={14} className="text-ink" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Review Permissions Section */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Review Permissions
        </div>
        <div className="rounded-xl border border-line bg-surface/60 p-3.5 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-ink" />
              <div>
                <div className="text-xs font-medium text-ink">
                  Allow Comments & Drawings
                </div>
                <div className="text-[11px] text-muted">
                  Guests can add frame-accurate comments and canvas annotations
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => onAllowCommentsChange(e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink focus:ring-lime cursor-pointer accent-lime"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-line/50">
            <div className="flex items-center gap-2">
              <ThumbsUp size={14} className="text-ink" />
              <div>
                <div className="text-xs font-medium text-ink">
                  Allow Approvals & Decisions
                </div>
                <div className="text-[11px] text-muted">
                  Guests can approve or request changes with review notes
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowApproval}
              onChange={(e) => onAllowApprovalChange(e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink focus:ring-lime cursor-pointer accent-lime"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-line/50">
            <div className="flex items-center gap-2">
              <Download size={14} className="text-ink" />
              <div>
                <div className="text-xs font-medium text-ink">
                  Allow Original File Download
                </div>
                <div className="text-[11px] text-muted">
                  Guests can download the master media asset file
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => onAllowDownloadChange(e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink focus:ring-lime cursor-pointer accent-lime"
            />
          </label>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full justify-center"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Generating Link..." : "Create Share Link"}
      </Button>
    </form>
  );
}
