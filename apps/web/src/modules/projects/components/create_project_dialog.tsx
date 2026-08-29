"use client";

import { type FormEvent } from "react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

interface CreateProjectDialogProps {
  isOpen?: boolean;
  isPending: boolean;
  hasError: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateProjectDialog({
  isOpen = true,
  isPending,
  hasError,
  onClose,
  onSubmit,
}: CreateProjectDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      closeOnEscape={!isPending}
      ariaLabelledBy="create-project-dialog-title"
      ariaDescribedBy="create-project-dialog-description"
      size="md"
    >
      <DialogCloseButton onClick={onClose} disabled={isPending} />
      <DialogHeader>
        <DialogEyebrow>New project</DialogEyebrow>
        <DialogTitle id="create-project-dialog-title">
          Start a new project
        </DialogTitle>
        <DialogDescription id="create-project-dialog-description">
          Give the review room a clear client or campaign name.
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-xs font-bold text-ink">
            Project name
            <input
              className="w-full rounded-lg border border-[#d2d3cb] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-lime/45"
              name="name"
              required
              maxLength={120}
              placeholder="Summer campaign"
              autoFocus
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-ink">
            <span>
              Description{" "}
              <small className="ml-1 font-medium text-muted">Optional</small>
            </span>
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-[#d2d3cb] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-lime/45"
              name="description"
              maxLength={500}
              placeholder="What is the team shipping?"
            />
          </label>
          {hasError ? (
            <p
              className="m-0 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
              role="alert"
            >
              The project could not be created. Check your organization access
              and try again.
            </p>
          ) : null}
          <div className="mt-2">
            <Button
              disabled={isPending}
              pending={isPending}
              type="submit"
              variant="primary"
              className="w-full justify-center"
            >
              Create project
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  );
}
