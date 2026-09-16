"use client";

import type { MediaResponse } from "@feedio/api-client";
import { useStackMedia } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Film, Layers, Loader2 } from "lucide-react";
import React, { useState } from "react";
import {
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
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogEyebrow>Version Stacking</DialogEyebrow>
        <DialogTitle>Stack Media Versions</DialogTitle>
        <DialogDescription>
          Stack two media items into a version stack. The dropped media will become the latest version.
        </DialogDescription>
        <DialogCloseButton onClick={onClose} />
      </DialogHeader>

      <DialogBody>
        <div className="space-y-4">
          {/* Target Media (Base / Current Version) */}
          <div className="rounded-xl border border-line bg-paper p-3 flex items-center gap-3">
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface flex items-center justify-center">
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
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-mono font-bold text-white">
                V{targetMedia.version_number ?? 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Target Media
              </span>
              <h4 className="truncate text-xs font-bold text-ink">{targetMedia.title}</h4>
              <p className="text-[11px] text-muted">
                Current stack: {currentCount} version{currentCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Stacking Arrow Indicator */}
          <div className="flex justify-center -my-1">
            <div className="grid size-7 place-items-center rounded-full border border-line bg-surface text-ink shadow-2xs">
              <ArrowDown size={14} />
            </div>
          </div>

          {/* Source Media (Incoming New Version) */}
          <div className="rounded-xl border-2 border-lime/60 bg-lime/10 p-3 flex items-center gap-3">
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface flex items-center justify-center">
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
              <span className="absolute bottom-1 left-1 rounded bg-lime px-1 py-0.5 text-[9px] font-mono font-bold text-ink border border-ink/20">
                V{newVersionNumber}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c7000]">
                New Version (V{newVersionNumber})
              </span>
              <h4 className="truncate text-xs font-bold text-ink">{sourceMedia.title}</h4>
              <p className="text-[11px] text-muted">
                Will become the primary version by default
              </p>
            </div>
          </div>

          {/* Version Description Input */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="version-label-input"
              className="text-xs font-bold uppercase tracking-wider text-muted font-mono"
            >
              Version Description (Optional)
            </label>
            <input
              id="version-label-input"
              type="text"
              placeholder="e.g. Color Graded Final, Rough Cut v2..."
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none transition focus:border-ink placeholder:text-muted"
            />
            <p className="text-[11px] text-muted">
              Descriptions help your team distinguish review cuts across the workspace.
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={stackMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="lime"
          size="sm"
          onClick={handleConfirm}
          disabled={stackMutation.isPending}
        >
          {stackMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin mr-1.5" />
              Stacking...
            </>
          ) : (
            <>
              <Layers size={14} className="mr-1.5" />
              Stack Versions
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
