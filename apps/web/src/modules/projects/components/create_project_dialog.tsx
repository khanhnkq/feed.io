"use client";

import { type FormEvent, useState } from "react";
import { Globe, Lock } from "lucide-react";

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
  const [visibility, setVisibility] = useState<"public" | "private">("public");

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
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
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
              className="min-h-20 w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
              name="description"
              maxLength={500}
              placeholder="What is the team shipping?"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-xs font-bold text-ink">Privacy & Access</span>
            <input type="hidden" name="visibility" value={visibility} />
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
                  All active members in this organization can access.
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
                  Only assigned collaborators & org admins can access.
                </p>
              </button>
            </div>
          </div>

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
