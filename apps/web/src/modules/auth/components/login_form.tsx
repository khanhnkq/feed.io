"use client";

import { type ApiError, useLogin } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Field, FormError, SubmitButton } from "./form_controls";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin<ApiError>({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        router.replace("/projects");
      },
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate({
      data: { email: String(data.get("email")), password: String(data.get("password")) },
    });
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <Field autoComplete="email" id="login-email" label="Work email" name="email" placeholder="you@studio.com" required type="email" />
      <div className="grid gap-2">
        <Field autoComplete="current-password" id="login-password" label="Password" name="password" required type="password" />
        <Link className="justify-self-end text-[11px] font-bold underline decoration-line underline-offset-4 hover:decoration-ink" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      <FormError message={login.error?.message} />
      <SubmitButton pending={login.isPending}>Sign in</SubmitButton>
    </form>
  );
}
