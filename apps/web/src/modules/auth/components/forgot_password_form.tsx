"use client";

import { type ApiError, useForgotPassword } from "@feedio/api-client";
import type { FormEvent } from "react";

import { Field, FormError, SubmitButton } from "./form_controls";

export function ForgotPasswordForm() {
  const forgot = useForgotPassword<ApiError>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    forgot.mutate({ data: { email: String(data.get("email")) } });
  }

  if (forgot.isSuccess) {
    return (
      <div className="rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm leading-relaxed">
        If that account exists, a reset link is on its way. Open Mailpit in local development to read it.
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <Field autoComplete="email" id="forgot-email" label="Work email" name="email" placeholder="you@studio.com" required type="email" />
      <FormError message={forgot.error?.message} />
      <SubmitButton pending={forgot.isPending}>Send reset link</SubmitButton>
    </form>
  );
}
