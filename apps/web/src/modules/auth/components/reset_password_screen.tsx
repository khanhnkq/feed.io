"use client";

import { type ApiError, useResetPassword } from "@feedio/api-client";
import { type FormEvent, useMemo } from "react";

import { Button } from "@/modules/ui";
import { AuthShell } from "./auth_shell";
import { Field, FormError, SubmitButton } from "./form_controls";

interface ResetPasswordScreenProps {
  token?: string;
}

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
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

  const state = useMemo(() => {
    if (!token) {
      return {
        status: "missing_token" as const,
        title: "Invalid reset link",
        description:
          "This password reset link is invalid, expired, or missing its security token.",
      };
    }
    if (reset.isSuccess) {
      return {
        status: "success" as const,
        title: "Password updated",
        description:
          "Your password has been changed successfully. You can now sign in with your new credentials.",
      };
    }
    return {
      status: "form" as const,
      title: "Secure your account",
      description:
        "Choose a strong new password to secure and access your Feed.io account.",
    };
  }, [token, reset.isSuccess]);

  return (
    <AuthShell
      description={state.description}
      step="02 / NEW PASSWORD"
      title={state.title}
    >
      {state.status === "missing_token" ? (
        <div className="grid gap-5">
          <FormError message="Please request a new password recovery link." />
          <Button fullWidth href="/forgot-password" size="lg" variant="outline">
            Request new reset link
          </Button>
        </div>
      ) : null}

      {state.status === "success" ? (
        <div className="grid gap-5">
          <div className="rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm font-medium text-ink">
            ✓ Password updated. All previous sessions were signed out.
          </div>
          <Button fullWidth href="/login" size="lg" variant="primary">
            Sign in to Feed.io &rarr;
          </Button>
        </div>
      ) : null}

      {state.status === "form" ? (
        <form className="grid gap-5" onSubmit={submit}>
          <Field
            autoComplete="new-password"
            hint="Use at least 12 characters."
            id="reset-password"
            label="New password"
            minLength={12}
            name="password"
            required
            type="password"
          />
          <Field
            autoComplete="new-password"
            id="reset-confirmation"
            label="Confirm new password"
            minLength={12}
            name="confirmation"
            required
            type="password"
          />
          <FormError message={reset.error?.message} />
          <SubmitButton pending={reset.isPending}>Update password</SubmitButton>
        </form>
      ) : null}
    </AuthShell>
  );
}
