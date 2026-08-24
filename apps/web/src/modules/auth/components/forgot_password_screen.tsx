"use client";

import { type ApiError, useForgotPassword } from "@feedio/api-client";
import Link from "next/link";
import { type FormEvent, useMemo } from "react";

import { Button } from "@/modules/ui";
import { AuthShell } from "./auth_shell";
import { Field, FormError, SubmitButton } from "./form_controls";

export function ForgotPasswordScreen() {
  const forgot = useForgotPassword<ApiError>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    forgot.mutate({ data: { email: String(data.get("email")) } });
  }

  const state = useMemo(() => {
    if (forgot.isSuccess) {
      return {
        isSuccess: true,
        title: "Check your inbox",
        description:
          "We sent password reset instructions to your email address. Follow the link in your inbox to set a new password.",
      };
    }
    return {
      isSuccess: false,
      title: "Reset your password",
      description:
        "Enter your account email address and we will send you a secure link to reset your password.",
    };
  }, [forgot.isSuccess]);

  return (
    <AuthShell
      description={state.description}
      footer={
        <Link
          className="font-bold text-ink underline underline-offset-4"
          href="/login"
        >
          Back to sign in
        </Link>
      }
      step="01 / RECOVERY"
      title={state.title}
    >
      {state.isSuccess ? (
        <div className="grid gap-5">
          <div className="rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm leading-relaxed">
            If an account exists with that email address, we have sent a reset
            link. Please check your inbox.
          </div>
          <Button fullWidth href="/login" size="lg" variant="outline">
            Return to sign in
          </Button>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={submit}>
          <Field
            autoComplete="email"
            id="forgot-email"
            label="Work email"
            name="email"
            placeholder="you@studio.com"
            required
            type="email"
          />
          <FormError message={forgot.error?.message} />
          <SubmitButton pending={forgot.isPending}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
