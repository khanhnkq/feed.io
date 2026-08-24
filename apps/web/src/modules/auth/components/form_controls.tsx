import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/modules/ui";

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
      {hint ? (
        <span className="text-[11px] font-normal leading-relaxed text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      fullWidth
      pending={pending}
      size="lg"
      type="submit"
      variant="primary"
    >
      {children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800"
      role="alert"
    >
      {message}
    </p>
  );
}
