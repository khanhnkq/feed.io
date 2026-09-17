"use client";

import type { MediaResponse } from "@feedio/api-client";
import { useStackMedia } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDown, Film, Layers, Loader2 } from "lucide-react";
import React, { useState } from "react";
import {
  Badge,
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

interface StackConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  targetMedia: MediaResponse | null;
  sourceMedia: MediaResponse | null;
  onSuccess?: () => void;
}

export function StackConfirmDialog({
  isOpen,
  onClose,
  organizationId,
  projectId,
  targetMedia,
  sourceMedia,
  onSuccess,
}: StackConfirmDialogProps) {
  const queryClient = useQueryClient();
  const [versionLabel, setVersionLabel] = useState("");
  const stackMutation = useStackMedia();

  if (!targetMedia || !sourceMedia) {
    return null;
  }

  const currentCount = targetMedia.version_count ?? 1;
  const newVersionNumber = currentCount + 1;

  const handleConfirm = async () => {
    try {
      await stackMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: targetMedia.id,
        data: {
          source_media_id: sourceMedia.id,
          version_label: versionLabel.trim() || undefined,
        },
      });

      // Invalidate project media lists & version queries
      await queryClient.invalidateQueries({
        queryKey: [`/api/v1/organizations/${organizationId}/projects/${projectId}/media`],
      });

      setVersionLabel("");
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error("Failed to stack media:", err);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogCloseButton onClick={onClose} disabled={stackMutation.isPending} />
      <DialogHeader>
        <DialogEyebrow>Version Stacking</DialogEyebrow>
        <DialogTitle className="flex items-center gap-2">
          <span>Stack Media Versions</span>
          <Badge size="sm" variant="lime" className="font-mono text-[10px]">
            V{newVersionNumber}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Stack <strong className="font-semibold text-ink">{sourceMedia.title}</strong> into{" "}
          <strong className="font-semibold text-ink">{targetMedia.title}</strong> as the latest review version.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Target Media (Base / Current Version Stack) */}
        <div className="rounded-xl border border-line bg-surface p-3.5 transition-all">
          <div className="flex items-start gap-3.5">
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
              {targetMedia.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={targetMedia.thumbnail_url}
                  alt={targetMedia.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Film size={20} className="text-muted" />
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                V{targetMedia.version_number ?? 1}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-ink truncate max-w-[220px]" title={targetMedia.title}>
                  {targetMedia.title}
                </span>
                <Badge size="sm" variant="outline" className="font-mono text-[10px]">
                  Target • {currentCount} version{currentCount === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                Existing version stack currently active in this project.
              </p>
            </div>
          </div>
        </div>

        {/* Stacking Flow Indicator */}
        <div className="flex items-center justify-center gap-2 py-0.5">
          <div className="h-px flex-1 bg-line" />
          <span className="flex items-center gap-1.5 rounded border border-line bg-paper px-3 py-1 font-mono text-[10px] font-bold text-muted">
            <ArrowDown size={11} className="text-ink" />
            <span>Stacking into V{newVersionNumber}</span>
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* Source Media (Incoming New Version) */}
        <div className="rounded-xl border-2 border-lime bg-lime/10 p-3.5 shadow-2xs transition-all">
          <div className="flex items-start gap-3.5">
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-lime/60 bg-paper flex items-center justify-center">
              {sourceMedia.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sourceMedia.thumbnail_url}
                  alt={sourceMedia.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Film size={20} className="text-muted" />
              )}
              <span className="absolute bottom-1 left-1 rounded bg-lime px-1.5 py-0.5 text-[9px] font-mono font-extrabold text-ink border border-ink/20">
                V{newVersionNumber}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-ink truncate max-w-[220px]" title={sourceMedia.title}>
                  {sourceMedia.title}
                </span>
                <Badge size="sm" variant="lime" className="font-mono text-[10px]">
                  New Primary Version
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                Will become the active primary cut for review and player display.
              </p>
            </div>
          </div>
        </div>

        {/* Version Description Input */}
        <div className="space-y-1.5 pt-1">
          <label
            htmlFor="version-label-input"
            className="block text-xs font-semibold text-ink"
          >
            Version Description <span className="font-normal text-muted">(Optional)</span>
          </label>
          <input
            id="version-label-input"
            type="text"
            placeholder={`e.g. "Color Grade Pass 2", "Client Cut v${newVersionNumber}"`}
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            maxLength={100}
            disabled={stackMutation.isPending}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-hidden transition"
          />
          <p className="text-[11px] text-muted">
            Descriptions help your team distinguish review cuts across the workspace.
          </p>
        </div>

        {/* Mutation Error Alert */}
        {stackMutation.isError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">
              {stackMutation.error instanceof Error
                ? stackMutation.error.message
                : "Failed to stack media versions. Please try again."}
            </p>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={stackMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          disabled={stackMutation.isPending}
        >
          {stackMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin mr-1.5" />
              <span>Stacking V{newVersionNumber}...</span>
            </>
          ) : (
            <>
              <Layers size={14} className="mr-1.5" />
              <span>Stack as V{newVersionNumber}</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
