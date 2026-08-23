"use client";

import { useEffect, type FormEvent } from "react";
import { X } from "lucide-react";

interface CreateProjectDialogProps {
  isPending: boolean;
  hasError: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateProjectDialog({
  isPending,
  hasError,
  onClose,
  onSubmit,
}: CreateProjectDialogProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[rgb(12_13_10_/_66%)] p-6 backdrop-blur-sm" role="presentation">
      <section
        className="relative w-full max-w-[480px] rounded-[14px] bg-surface p-8 shadow-[0_30px_80px_rgb(0_0_0_/_30%)] md:p-[34px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <button
          className="absolute right-[18px] top-[18px] grid size-11 place-items-center rounded-md border-0 bg-transparent text-ink hover:bg-[#ecece5] focus-visible:outline-3 focus-visible:outline-focus disabled:opacity-50"
          type="button"
          onClick={onClose}
          aria-label="Close"
          disabled={isPending}
        >
          <X size={18} />
        </button>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.13em] text-muted">New project</p>
        <h2 id="dialog-title" className="m-0 text-[32px] font-bold tracking-[-.04em]">Start a new project</h2>
        <p id="dialog-description" className="text-muted">Give the review room a clear client or campaign name.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-xs font-bold">
            Project name
            <input
              className="w-full rounded-lg border border-[#d2d3cb] bg-white px-3 py-3 outline-none focus:border-ink focus:ring-3 focus:ring-lime/45"
              name="name"
              required
              maxLength={120}
              placeholder="Summer campaign"
              autoFocus
            />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>
              Description <small className="ml-1 font-medium text-muted">Optional</small>
            </span>
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-[#d2d3cb] bg-white px-3 py-3 outline-none focus:border-ink focus:ring-3 focus:ring-lime/45"
              name="description"
              maxLength={500}
              placeholder="What is the team shipping?"
            />
          </label>
          {hasError ? (
            <p className="m-0 border-l-[3px] border-[#b8471d] bg-[#fff0e9] px-3 py-2.5 text-xs leading-relaxed text-[#8c3212]" role="alert">
              The project could not be created. Check your organization access and try again.
            </p>
          ) : null}
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-55"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Creating…" : "Create project"}
          </button>
        </form>
      </section>
    </div>
  );
}
