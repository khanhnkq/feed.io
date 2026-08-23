"use client";

import { type ApiError, useResetPassword } from "@feedio/api-client";
import Link from "next/link";
import type { FormEvent } from "react";

import { Field, FormError, SubmitButton } from "./form_controls";

export function ResetPasswordForm({ token }: { token?: string }) {
  const reset = useResetPassword<ApiError>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirmation = String(data.get("confirmation"));
    if (password !== confirmation) return;
    reset.mutate({ data: { token, new_password: password } });
  }

  if (!token) {
    return <FormError message="This reset link is missing its token. Request a new link." />;
  }

  if (reset.isSuccess) {
    return (
      <div className="grid gap-5 rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm">
        <p>Your password was updated and all previous sessions were revoked.</p>
        <Link className="font-bold underline underline-offset-4" href="/login">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <Field autoComplete="new-password" hint="Use at least 12 characters." id="reset-password" label="New password" minLength={12} name="password" required type="password" />
      <Field autoComplete="new-password" id="reset-confirmation" label="Confirm new password" minLength={12} name="confirmation" required type="password" />
      <FormError message={reset.error?.message} />
      <SubmitButton pending={reset.isPending}>Update password</SubmitButton>
    </form>
  );
}
