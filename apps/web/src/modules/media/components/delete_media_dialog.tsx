"use client";

import type { MediaResponse } from "@feedio/api-client";
import { useDeleteMedia } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
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

interface DeleteMediaDialogProps {
  media: MediaResponse | null;
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
}

export function DeleteMediaDialog({
  media,
  isOpen,
  onClose,
  organizationId,
  projectId,
}: DeleteMediaDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = useDeleteMedia();

  const handleDelete = () => {
    if (!media) return;

    // 1. Snapshot previous query cache for rollback
    const previousMediaQueries = queryClient.getQueriesData<{ items?: MediaResponse[]; total?: number }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (k) => typeof k === "string" && k.includes(projectId) && k.includes("media"),
        ),
    });

    // 2. Optimistic Update (0ms): filter out deleted media immediately
    queryClient.setQueriesData<{ items?: MediaResponse[]; total?: number }>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (key) =>
              typeof key === "string" &&
              key.includes(projectId) &&
              key.includes("media"),
          ),
      },
      (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== media.id),
          total: typeof old.total === "number" ? Math.max(0, old.total - 1) : old.total,
        };
      },
    );

    // 3. Close dialog immediately (0ms response)
    onClose();

    // 4. Background Mutation without blocking UI or refetching
    deleteMutation.mutate(
      {
        organizationId,
        projectId,
        mediaId: media.id,
      },
      {
        onError: (error: unknown) => {
          // Rollback cache if mutation fails
          previousMediaQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to delete media:", error);
        },
      },
    );
  };

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  if (!media) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabelledBy="delete-media-dialog-title"
      ariaDescribedBy="delete-media-dialog-description"
      size="md"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Danger Zone</DialogEyebrow>
          <DialogCloseButton
            onClick={handleClose}
            disabled={deleteMutation.isPending}
          />
        </div>
        <DialogTitle id="delete-media-dialog-title">Delete video cut</DialogTitle>
        <DialogDescription id="delete-media-dialog-description">
          Are you sure you want to delete this video cut?
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              Video &ldquo;{media.title}&rdquo; will be deleted
            </p>
            <p className="mt-1 leading-relaxed text-red-700">
              This action will remove the video cut and its associated metadata from this project.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={deleteMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={15} />
          {deleteMutation.isPending ? "Deleting..." : "Delete Video"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
