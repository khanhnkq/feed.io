import type { ComponentProps, ReactNode } from "react";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, id, ...input }: FieldProps) {
  return (
    <label className="grid gap-2 text-[13px] font-bold" htmlFor={id}>
      <span>{label}</span>
      <input
        className="min-h-12 w-full rounded-lg border border-[#c9cbc2] bg-white px-4 text-sm font-normal outline-none transition placeholder:text-[#a0a39a] focus:border-ink focus:ring-3 focus:ring-lime/60"
        id={id}
        {...input}
      />
      {hint ? <span className="text-[11px] font-normal leading-relaxed text-muted">{hint}</span> : null}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-ink bg-ink px-5 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800" role="alert">
      {message}
    </p>
  );
}
