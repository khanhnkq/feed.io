"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  useGetMediaVersions,
  useSetPrimaryVersion,
  useUnstackMedia,
  useUpdateVersionLabel,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Columns2,
  Film,
  Pencil,
  Plus,
  Star,
  Unlink,
} from "lucide-react";
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
import { formatBytes, formatDuration } from "../lib/media_formatters";

interface VersionStackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  media: MediaResponse | null;
  onCompare?: (targetMedia: MediaResponse, compareMedia: MediaResponse) => void;
  onUploadNewVersion?: (media: MediaResponse) => void;
}

export function VersionStackDialog({
  isOpen,
  onClose,
  organizationId,
  projectId,
  media,
  onCompare,
  onUploadNewVersion,
}: VersionStackDialogProps) {
  const queryClient = useQueryClient();
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState("");

  const versionsQuery = useGetMediaVersions(
    organizationId,
    projectId,
    media?.id ?? "",
    {
      query: {
        enabled: Boolean(isOpen && media?.id),
      },
    },
  );

  const setPrimaryMutation = useSetPrimaryVersion();
  const unstackMutation = useUnstackMedia();
  const updateLabelMutation = useUpdateVersionLabel();

  if (!media) return null;

  const versions = versionsQuery.data ?? [media];
  // Sort versions newest / highest version_number first
  const sortedVersions = [...versions].sort(
    (a, b) => (b.version_number ?? 1) - (a.version_number ?? 1),
  );

  const invalidateData = async () => {
    await queryClient.invalidateQueries({
      queryKey: [`/api/v1/organizations/${organizationId}/projects/${projectId}/media`],
    });
    await versionsQuery.refetch();
  };

  const handleSetPrimary = async (version: MediaResponse) => {
    try {
      await setPrimaryMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: version.id,
      });
      await invalidateData();
    } catch (err) {
      console.error("Failed to set primary version:", err);
    }
  };

  const handleUnstack = async (version: MediaResponse) => {
    try {
      await unstackMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: version.id,
      });
      await invalidateData();
      if (versions.length <= 2) {
        onClose();
      }
    } catch (err) {
      console.error("Failed to unstack version:", err);
    }
  };

  const handleSaveLabel = async (versionId: string) => {
    try {
      await updateLabelMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: versionId,
        data: {
          version_label: tempLabel.trim() || undefined,
        },
      });
      setEditingLabelId(null);
      await invalidateData();
    } catch (err) {
      console.error("Failed to update version label:", err);
    }
  };

  const primaryVersion = versions.find((v) => v.is_primary_version) ?? versions[0];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <DialogEyebrow>Version Manager</DialogEyebrow>
        <DialogTitle className="flex items-center gap-2">
          <span>Manage Version Stack</span>
          <Badge size="sm" variant="lime">
            {versions.length} versions
          </Badge>
        </DialogTitle>
        <DialogDescription>
          View version history, set the primary preview version, or unstack assets.
        </DialogDescription>
        <DialogCloseButton onClick={onClose} />
      </DialogHeader>

      <DialogBody>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {sortedVersions.map((v) => {
            const isPrimary = v.is_primary_version;
            const isEditing = editingLabelId === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isPrimary
                    ? "border-lime bg-lime/10 shadow-2xs"
                    : "border-line bg-surface hover:border-ink/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Thumbnail & Version Badge */}
                  <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film size={20} className="text-muted" />
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-mono font-bold text-white">
                      V{v.version_number ?? 1}
                    </span>
                  </div>

                  {/* Version Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-ink truncate max-w-[200px]">
                        {v.title}
                      </span>
                      {isPrimary && (
                        <Badge size="sm" variant="lime" className="font-mono text-[10px]">
                          <Star size={10} className="fill-ink text-ink mr-0.5" />
                          Primary
                        </Badge>
                      )}

                      {/* Review Status Badge */}
                      {v.review_status === "approved" && (
                        <Badge size="sm" variant="success" className="text-[10px]">
                          <CheckCircle2 size={10} className="mr-0.5" /> Approved
                        </Badge>
                      )}
                      {v.review_status === "needs_changes" && (
                        <Badge size="sm" variant="danger" className="text-[10px]">
                          <AlertCircle size={10} className="mr-0.5" /> Needs Changes
                        </Badge>
                      )}
                      {v.review_status === "in_progress" && (
                        <Badge size="sm" variant="outline" className="text-[10px]">
                          <Clock size={10} className="mr-0.5" /> In Progress
                        </Badge>
                      )}
                    </div>

                    {/* Version Label Editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={tempLabel}
                          onChange={(e) => setTempLabel(e.target.value)}
                          placeholder="Version label..."
                          maxLength={100}
                          className="flex-1 rounded border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-ink"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLabel(v.id)}
                          className="grid size-6 place-items-center rounded bg-lime text-ink hover:bg-lime/80"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLabelId(null)}
                          className="grid size-6 place-items-center rounded border border-line text-muted hover:text-ink"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="italic">
                          {v.version_label || "No label"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLabelId(v.id);
                            setTempLabel(v.version_label || "");
                          }}
                          className="text-muted hover:text-ink transition"
                          title="Edit version label"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5 text-[11px] font-mono text-muted">
                      <span>{formatBytes(v.file_size_bytes)}</span>
                      {v.duration_seconds && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(v.duration_seconds)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    {!isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(v)}
                        disabled={setPrimaryMutation.isPending}
                        title="Set as primary version"
                      >
                        <Star size={11} className="mr-1" />
                        Set Primary
                      </Button>
                    )}

                    {onCompare && v.id !== primaryVersion?.id && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          onClose();
                          if (primaryVersion) {
                            onCompare(primaryVersion, v);
                          }
                        }}
                        title="Compare with Primary Version"
                      >
                        <Columns2 size={11} className="mr-1" />
                        Compare
                      </Button>
                    )}

                    {versions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnstack(v)}
                        disabled={unstackMutation.isPending}
                        className="text-muted hover:text-red-600 hover:border-red-300"
                        title="Unstack as standalone media"
                      >
                        <Unlink size={11} className="mr-1" />
                        Unstack
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogBody>

      <DialogFooter>
        {onUploadNewVersion && (
          <Button
            variant="lime"
            size="sm"
            onClick={() => {
              onClose();
              onUploadNewVersion(media);
            }}
          >
            <Plus size={14} className="mr-1" />
            Upload New Version
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
