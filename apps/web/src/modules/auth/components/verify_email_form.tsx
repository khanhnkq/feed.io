"use client";

import { type ApiError, useResendVerification, useVerifyEmail } from "@feedio/api-client";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { FormError } from "./form_controls";

export function VerifyEmailForm({ token, email }: { token?: string; email?: string }) {
  const started = useRef(false);
  const verify = useVerifyEmail<ApiError>();
  const resend = useResendVerification<ApiError>();

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate({ data: { token } });
    }
  }, [token, verify]);

  if (verify.isPending) {
    return <p className="animate-pulse text-sm text-muted">Verifying your email…</p>;
  }

  if (verify.isSuccess) {
    return (
      <div className="grid gap-5 rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm">
        <p>Email verified. Sign in to finish setting up your workspace.</p>
        <Link className="font-bold underline underline-offset-4" href="/login">Sign in to Feed.io</Link>
      </div>
    );
  }

  if (verify.isError) return <FormError message={verify.error.message} />;

  return (
    <div className="grid gap-5 text-sm leading-relaxed">
      <div className="rounded-lg border border-line bg-paper p-5">
        We sent a verification link{email ? <> to <strong>{email}</strong></> : ""}. In local development, read it in Mailpit at port 8025.
      </div>
      {email ? (
        <button
          className="min-h-11 rounded-lg border border-ink px-4 text-xs font-bold transition hover:bg-ink hover:text-white disabled:opacity-60"
          disabled={resend.isPending || resend.isSuccess}
          onClick={() => resend.mutate({ data: { email } })}
          type="button"
        >
          {resend.isSuccess ? "Verification email sent" : "Resend verification email"}
        </button>
      ) : null}
      <FormError message={resend.error?.message} />
    </div>
  );
}
