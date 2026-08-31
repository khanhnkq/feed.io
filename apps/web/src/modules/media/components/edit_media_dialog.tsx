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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await updateMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: media.id,
        data: { title: title.trim() },
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/v1/organizations", organizationId, "projects", projectId, "media"],
      });
      onClose();
    } catch {
      // Error handled by mutation
    }
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
