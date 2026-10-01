"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  getGetMediaVersionsQueryKey,
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

  const versionsQueryKey = getGetMediaVersionsQueryKey(
    organizationId,
    projectId,
    media.id,
  );

  const handleSetPrimary = (version: MediaResponse) => {
    // 1. Snapshot previous caches
    const previousVersions = queryClient.getQueryData<MediaResponse[]>(versionsQueryKey);
    const previousMediaQueries = queryClient.getQueriesData<{ items?: MediaResponse[] }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
        ),
    });

    // 2. Optimistic update (0ms): toggle is_primary_version in versions query
    queryClient.setQueryData<MediaResponse[]>(versionsQueryKey, (old) => {
      if (!old) return old;
      return old.map((v) => ({
        ...v,
        is_primary_version: v.id === version.id,
      }));
    });

    // Also update project media cache to reflect primary version
    queryClient.setQueriesData<{ items?: MediaResponse[] }>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
          ),
      },
      (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((m) =>
            m.id === media.id || m.id === version.id
              ? { ...m, is_primary_version: m.id === version.id }
              : m,
          ),
        };
      },
    );

    // 3. Mutate in background
    setPrimaryMutation.mutate(
      {
        organizationId,
        projectId,
        mediaId: version.id,
      },
      {
        onError: (err) => {
          queryClient.setQueryData(versionsQueryKey, previousVersions);
          previousMediaQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to set primary version:", err);
        },
      },
    );
  };

  const handleUnstack = (version: MediaResponse) => {
    // 1. Snapshot previous caches
    const previousVersions = queryClient.getQueryData<MediaResponse[]>(versionsQueryKey);
    const previousMediaQueries = queryClient.getQueriesData<{ items?: MediaResponse[]; total?: number }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
        ),
    });

    // 2. Optimistic update (0ms): filter out unstacked version
    queryClient.setQueryData<MediaResponse[]>(versionsQueryKey, (old) => {
      if (!old) return old;
      return old.filter((v) => v.id !== version.id);
    });

    // Update version_count in project media list
    queryClient.setQueriesData<{ items?: MediaResponse[]; total?: number }>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
          ),
      },
      (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((m) =>
            m.id === media.id
              ? { ...m, version_count: Math.max(1, (m.version_count ?? 1) - 1) }
              : m,
          ),
        };
      },
    );

    if (versions.length <= 2) {
      onClose();
    }

    // 3. Mutate in background
    unstackMutation.mutate(
      {
        organizationId,
        projectId,
        mediaId: version.id,
      },
      {
        onError: (err) => {
          queryClient.setQueryData(versionsQueryKey, previousVersions);
          previousMediaQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to unstack version:", err);
        },
      },
    );
  };

  const handleSaveLabel = (versionId: string) => {
    const newLabel = tempLabel.trim() || undefined;
    setEditingLabelId(null);

    // 1. Snapshot previous cache
    const previousVersions = queryClient.getQueryData<MediaResponse[]>(versionsQueryKey);

    // 2. Optimistic update (0ms)
    queryClient.setQueryData<MediaResponse[]>(versionsQueryKey, (old) => {
      if (!old) return old;
      return old.map((v) =>
        v.id === versionId ? { ...v, version_label: newLabel ?? null } : v,
      );
    });

    // 3. Mutate in background
    updateLabelMutation.mutate(
      {
        organizationId,
        projectId,
        mediaId: versionId,
        data: {
          version_label: newLabel,
        },
      },
      {
        onError: (err) => {
          queryClient.setQueryData(versionsQueryKey, previousVersions);
          console.error("Failed to update version label:", err);
        },
      },
    );
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
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isPrimary
                    ? "border-lime bg-lime/10 shadow-2xs"
                    : "border-line bg-surface hover:border-ink/40"
                }`}
              >
                {/* Media Details Row */}
                <div className="flex items-start gap-3.5">
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
                    <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                      V{v.version_number ?? 1}
                    </span>
                  </div>

                  {/* Version Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-ink truncate max-w-[240px]" title={v.title}>
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

                    {/* Version Description Editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={tempLabel}
                          onChange={(e) => setTempLabel(e.target.value)}
                          placeholder="Version description..."
                          maxLength={100}
                          className="flex-1 rounded border border-line bg-paper px-2 py-0.5 text-xs text-ink outline-none focus:border-ink"
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
                    ) : v.version_label ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="font-medium text-ink">
                          {v.version_label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLabelId(v.id);
                            setTempLabel(v.version_label || "");
                          }}
                          className="text-muted hover:text-ink transition"
                          title="Edit version description"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLabelId(v.id);
                            setTempLabel("");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink transition hover:underline"
                          title="Add version description"
                        >
                          <Plus size={11} />
                          <span>Add description</span>
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
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-line/50 pt-2.5">
                  {!isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(v)}
                      disabled={setPrimaryMutation.isPending}
                      className="h-8 min-h-8 min-w-[96px] text-xs px-2.5"
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
                      className="h-8 min-h-8 min-w-[96px] text-xs px-2.5"
                      title="Compare with Primary Version"
                    >
                      <Columns2 size={11} className="mr-1" />
                      Compare
                    </Button>
                  )}

                  {versions.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUnstack(v)}
                      disabled={unstackMutation.isPending}
                      className="h-8 min-h-8 min-w-[96px] text-xs px-2.5"
                      title="Unstack as standalone media"
                    >
                      <Unlink size={11} className="mr-1" />
                      Unstack
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} className="min-w-[80px]">
          Close
        </Button>
        {onUploadNewVersion && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onUploadNewVersion(media);
            }}
            className="min-w-[140px]"
          >
            <Plus size={14} className="mr-1" />
            Upload New Version
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
