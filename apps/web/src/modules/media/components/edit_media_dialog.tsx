"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { type MediaResponse, useUpdateMedia } from "@feedio/api-client";
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

interface EditMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  media: MediaResponse | null;
}

export function EditMediaDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  media,
}: EditMediaDialogProps) {
  if (!media) return null;

  return (
    <Dialog isOpen={open} onClose={() => onOpenChange(false)} size="md">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Rename Asset</DialogEyebrow>
          <DialogCloseButton onClick={() => onOpenChange(false)} />
        </div>
        <DialogTitle id="edit-media-dialog-title">Rename video cut</DialogTitle>
        <DialogDescription id="edit-media-dialog-description">
          Change the display title of this video cut.
        </DialogDescription>
      </DialogHeader>

      <EditMediaForm
        key={media.id}
        media={media}
        organizationId={organizationId}
        projectId={projectId}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function EditMediaForm({
  media,
  organizationId,
  projectId,
  onClose,
}: {
  media: MediaResponse;
  organizationId: string;
  projectId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(media.title);
  const updateMutation = useUpdateMedia();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = title.trim();
    if (!newTitle) return;

    if (newTitle === media.title) {
      onClose();
      return;
    }

    // 1. Snapshot previous query cache for rollback
    const previousMediaQueries = queryClient.getQueriesData<{ items?: MediaResponse[] }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
        ),
    });
    const previousSingleMedia = queryClient.getQueriesData<MediaResponse>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) => typeof k === "string" && k.includes("media") && k.includes(media.id),
        ),
    });

    // 2. Optimistic Update (0ms) in list & single media caches
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
            m.id === media.id ? { ...m, title: newTitle } : m,
          ),
        };
      },
    );
    queryClient.setQueriesData<MediaResponse>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) => typeof k === "string" && k.includes("media") && k.includes(media.id),
          ),
      },
      (old) => (old ? { ...old, title: newTitle } : old),
    );

    // 3. Close dialog immediately (0ms response)
    onClose();

    // 4. Background Mutation without blocking UI or refetching
    updateMutation.mutate(
      {
        organizationId,
        projectId,
        mediaId: media.id,
        data: { title: newTitle },
      },
      {
        onError: (err) => {
          // Rollback cache if mutation fails
          previousMediaQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          previousSingleMedia.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to rename media:", err);
        },
        onSuccess: (updatedMedia) => {
          if (updatedMedia) {
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
                    m.id === media.id ? { ...m, ...updatedMedia } : m,
                  ),
                };
              },
            );
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="e.g. Scene 01 Final Cut"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
            required
            autoFocus
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
