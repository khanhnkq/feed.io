"use client";

import React, { useState } from "react";
import { googleLogin } from "@feedio/api-client";

import { Button } from "@/modules/ui";

export function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      viewBox="0 0 24 24"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);
      const data = await googleLogin();
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch {
      setError("Unable to initiate Google Sign-In. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        fullWidth
        onClick={handleGoogleLogin}
        pending={loading}
        size="lg"
        type="button"
        variant="outline"
      >
        <GoogleIcon />
        <span>{label}</span>
      </Button>
      {error ? (
        <p className="text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-2 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#c9cbc2]" />
      </div>
      <div className="relative bg-surface px-3 text-[11px] font-bold uppercase tracking-wider text-muted">
        or continue with
      </div>
    </div>
  );
}
