"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getGetCurrentUserQueryKey,
  googleCallback,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/modules/ui";
import { AuthShell } from "./auth_shell";
import { FormError } from "./form_controls";
import { getPostAuthRedirectUrl } from "../lib/post_auth_route";

interface GoogleCallbackScreenProps {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

type ScreenStatus = "loading" | "success" | "error";

interface ScreenState {
  status: ScreenStatus;
  title: string;
  description: string;
  errorMessage?: string;
}

export function GoogleCallbackScreen({
  code,
  state: oauthState,
  error: oauthError,
  errorDescription,
}: GoogleCallbackScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const started = useRef(false);

  const [status, setStatus] = useState<ScreenStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [redirectUrl, setRedirectUrl] = useState<string>("/app");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (oauthError) {
      setStatus("error");
      setErrorMessage(
        errorDescription || "Google sign-in was cancelled or access was denied.",
      );
      return;
    }

    if (!code || !oauthState) {
      setStatus("error");
      setErrorMessage("Missing authorization code or state from Google callback.");
      return;
    }

    async function exchange() {
      try {
        await googleCallback({ code: code!, state: oauthState! });
        const currentUser = await getCurrentUser();
        queryClient.setQueryData(getGetCurrentUserQueryKey(), currentUser);
        const destination = getPostAuthRedirectUrl(currentUser.has_organization);
        setRedirectUrl(destination);
        setStatus("success");
        router.replace(destination);
      } catch (err: unknown) {
        setStatus("error");
        const error = err as { response?: { data?: { detail?: string } } };
        const detail = error?.response?.data?.detail;
        setErrorMessage(
          detail || "Failed to complete Google authentication. Please try again.",
        );
      }
    }

    exchange();
  }, [code, oauthState, oauthError, errorDescription, router, queryClient]);

  const state: ScreenState = useMemo(() => {
    if (status === "success") {
      return {
        status: "success",
        title: "Signed in successfully!",
        description:
          "Your Google account has been verified. You are all set to access your Feedi workspace.",
      };
    }
    if (status === "error") {
      return {
        status: "error",
        title: "Sign-in failed",
        description: "Google sign-in could not be completed.",
        errorMessage,
      };
    }
    return {
      status: "loading",
      title: "Signing you in",
      description: "Please wait a moment while we verify your Google credentials…",
    };
  }, [status, errorMessage]);

  return (
    <AuthShell
      description={state.description}
      footer={
        state.status === "error" ? (
          <>
            Need help?{" "}
            <Link
              className="font-bold text-ink underline underline-offset-4"
              href="/login"
            >
              Back to sign in
            </Link>
          </>
        ) : undefined
      }
      step="02 / GOOGLE SIGN-IN"
      title={state.title}
    >
      {state.status === "loading" ? (
        <div className="grid gap-3 py-1" aria-busy="true" aria-label="Verifying credentials">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#ecece5]" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-[#ecece5]" />
        </div>
      ) : null}

      {state.status === "success" ? (
        <div className="grid gap-5">
          <div className="rounded-lg border border-[#bfd92c] bg-lime/20 p-5 text-sm font-medium text-ink">
            ✓ Signed in successfully!
          </div>
          <Button fullWidth href={redirectUrl} size="lg" variant="primary">
            Entering Feedi &rarr;
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
    </AuthShell>
  );
}
