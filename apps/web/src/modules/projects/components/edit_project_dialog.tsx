"use client";

import type { ProjectResponse } from "@feedio/api-client";
import {
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  useUpdateProject,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Globe, Lock } from "lucide-react";
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
import { useOrganization } from "@/shared/providers/organization_context";

interface EditProjectDialogProps {
  project: ProjectResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: ProjectResponse) => void;
}

export function EditProjectDialog({
  project,
  isOpen,
  onClose,
  onUpdated,
}: EditProjectDialogProps) {
  if (!project) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="edit-project-dialog-title"
      ariaDescribedBy="edit-project-dialog-description"
      size="md"
    >
      <EditProjectForm
        key={`${project.id}-${project.name}-${project.description}-${project.visibility}`}
        project={project}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </Dialog>
  );
}

function EditProjectForm({
  project,
  onClose,
  onUpdated,
}: {
  project: ProjectResponse;
  onClose: () => void;
  onUpdated?: (updated: ProjectResponse) => void;
}) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    (project.visibility as "public" | "private") || "public",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateProjectMutation = useUpdateProject({
    mutation: {
      onSuccess: async (data) => {
        setErrorMessage(null);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListProjectsQueryKey(organization.id),
          }),
          queryClient.invalidateQueries({
            queryKey: getGetProjectQueryKey(organization.id, project.id),
          }),
        ]);
        onClose();
        onUpdated?.(data);
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not update project. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a project name.");
      return;
    }

    setErrorMessage(null);
    updateProjectMutation.mutate({
      organizationId: organization.id,
      projectId: project.id,
      data: {
        name: trimmedName,
        description: description.trim(),
        visibility,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Project Settings</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={updateProjectMutation.isPending}
          />
        </div>
        <DialogTitle id="edit-project-dialog-title">Edit project</DialogTitle>
        <DialogDescription id="edit-project-dialog-description">
          Update the name, description, and privacy settings of this project.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="edit-project-name-input"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Project name
          </label>
          <input
            id="edit-project-name-input"
            type="text"
            required
            autoFocus
            maxLength={120}
            placeholder="e.g. Summer Campaign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="edit-project-description-input"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Description <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-project-description-input"
            rows={2}
            maxLength={500}
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Privacy & Access
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                visibility === "public"
                  ? "border-ink bg-surface shadow-[2px_2px_0px_#11130f]"
                  : "border-line bg-paper/60 hover:border-ink/40 text-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                <div
                  className={`grid size-6 place-items-center rounded-md border ${
                    visibility === "public"
                      ? "border-ink bg-lime text-ink"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  <Globe size={13} />
                </div>
                <span>Public</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted">
                All organization members can access.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                visibility === "private"
                  ? "border-ink bg-surface shadow-[2px_2px_0px_#11130f]"
                  : "border-line bg-paper/60 hover:border-ink/40 text-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                <div
                  className={`grid size-6 place-items-center rounded-md border ${
                    visibility === "private"
                      ? "border-ink bg-lime text-ink"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  <Lock size={13} />
                </div>
                <span>Private</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted">
                Only assigned members & admins.
              </p>
            </button>
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
          onClick={onClose}
          disabled={updateProjectMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateProjectMutation.isPending || !name.trim()}
        >
          <Check size={15} />
          {updateProjectMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
