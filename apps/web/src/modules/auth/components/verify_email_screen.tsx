"use client";

import {
  type ApiError,
  useResendVerification,
  useVerifyEmail,
} from "@feedio/api-client";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/modules/ui";
import { AuthShell } from "./auth_shell";
import { FormError } from "./form_controls";

interface VerifyEmailScreenProps {
  token?: string;
  email?: string;
}

type ScreenStatus = "inbox" | "loading" | "success" | "error";

interface ScreenState {
  status: ScreenStatus;
  title: string;
  description: string;
  errorMessage?: string;
}

export function VerifyEmailScreen({ token, email }: VerifyEmailScreenProps) {
  const started = useRef(false);
  const verify = useVerifyEmail<ApiError>();
  const resend = useResendVerification<ApiError>();

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate({ data: { token } });
    }
  }, [token, verify]);

  // Single source of truth for screen state derived from React Query & token
  const state: ScreenState = useMemo(() => {
    if (!token) {
      return {
        status: "inbox",
        title: "Check your inbox",
        description:
          "We sent a verification link to your email address. Follow the link to activate your Feed.io account.",
      };
    }
    if (verify.isSuccess) {
      return {
        status: "success",
        title: "Account activated!",
        description:
          "Your email address has been verified. You are all set to sign in and set up your creative organization.",
      };
    }
    if (verify.isError) {
      return {
        status: "error",
        title: "Verification failed",
        description: "This verification link is invalid or has expired.",
        errorMessage: verify.error?.message,
      };
    }
    return {
      status: "loading",
      title: "Activating your account",
      description: "Please wait a moment while we verify your email address…",
    };
  }, [token, verify.isSuccess, verify.isError, verify.error]);

  return (
    <AuthShell
      description={state.description}
      footer={
        state.status === "inbox" ? (
          <>
            Already verified?{" "}
            <Link
              className="font-bold text-ink underline underline-offset-4"
              href="/login"
            >
              Sign in
            </Link>
          </>
        ) : undefined
      }
      step="02 / VERIFY EMAIL"
      title={state.title}
    >
      {state.status === "loading" ? (
        <p className="animate-pulse text-sm text-muted">
          Verifying your email address…
        </p>
      ) : null}

      {state.status === "success" ? (
        <div className="grid gap-5">
          <div className="rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm font-medium text-ink">
            ✓ Email verified successfully!
          </div>
          <Button fullWidth href="/login" size="lg" variant="primary">
            Sign in to Feed.io &rarr;
          </Button>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="grid gap-5">
          <FormError message={state.errorMessage} />
          <Button fullWidth href="/login" size="lg" variant="outline">
            Back to sign in
          </Button>
        </div>
      ) : null}

      {state.status === "inbox" ? (
        <div className="grid gap-5 text-sm leading-relaxed">
          <div className="rounded-lg border border-line bg-paper p-5">
            We sent a verification link
            {email ? (
              <>
                {" "}
                to <strong>{email}</strong>
              </>
            ) : (
              ""
            )}
            . Please check your inbox and click the link to activate your account.
          </div>
          {email ? (
            <Button
              disabled={resend.isPending || resend.isSuccess}
              fullWidth
              onClick={() => resend.mutate({ data: { email } })}
              pending={resend.isPending}
              size="lg"
              type="button"
              variant="outline"
            >
              {resend.isSuccess
                ? "Verification email sent!"
                : "Resend verification email"}
            </Button>
          ) : null}
          <FormError message={resend.error?.message} />
        </div>
      ) : null}
    </AuthShell>
  );
}
