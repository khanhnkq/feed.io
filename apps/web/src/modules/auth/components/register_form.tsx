"use client";

import { type ApiError, useRegister } from "@feedio/api-client";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Field, FormError, SubmitButton } from "./form_controls";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister<ApiError>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    register.mutate(
      {
        data: {
          email,
          password: String(data.get("password")),
          display_name: String(data.get("display_name")),
        },
      },
      { onSuccess: () => router.push(`/verify-email?email=${encodeURIComponent(email)}`) },
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field autoComplete="name" id="register-name" label="Your name" name="display_name" required />
      <Field autoComplete="email" id="register-email" label="Work email" name="email" placeholder="you@studio.com" required type="email" />
      <Field autoComplete="new-password" hint="Use at least 12 characters." id="register-password" label="Password" minLength={12} name="password" required type="password" />
      <FormError message={register.error?.message} />
      <SubmitButton pending={register.isPending}>Create account</SubmitButton>
    </form>
  );
}
