"use client";

import { type ApiError, useRegister } from "@feedio/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Field, FormError, SubmitButton } from "./form_controls";
import { AuthDivider, GoogleButton } from "./google_button";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister<ApiError>();
  const [agreed, setAgreed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed) {
      setValidationError("Please agree to the Privacy Policy to create your account.");
      return;
    }
    setValidationError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    register.mutate(
      {
        data: {
          email,
          password: String(data.get("password")),
        },
      },
      { onSuccess: () => router.push(`/verify-email?email=${encodeURIComponent(email)}`) },
    );
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-4" onSubmit={submit}>
        <Field
          autoComplete="email"
          id="register-email"
          label="Work email"
          name="email"
          placeholder="you@studio.com"
          required
          type="email"
        />
        <Field
          autoComplete="new-password"
          hint="Use at least 12 characters."
          id="register-password"
          label="Password"
          minLength={12}
          name="password"
          required
          type="password"
        />

        <label
          htmlFor="register-privacy"
          className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs text-muted select-none"
        >
          <input
            id="register-privacy"
            name="privacy_agreement"
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setValidationError(null);
            }}
            className="mt-0.5 size-4 rounded border-line text-ink accent-ink focus:ring-2 focus:ring-lime/60 cursor-pointer shrink-0"
          />
          <span className="leading-relaxed">
            I have read and agree to Feedi&apos;s{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-bold text-ink underline underline-offset-4 hover:decoration-ink"
            >
              Privacy Policy
            </Link>{" "}
            and terms of service.
          </span>
        </label>

        <FormError message={validationError || register.error?.message} />
        <SubmitButton pending={register.isPending}>Create account</SubmitButton>
      </form>
      <AuthDivider />
      <GoogleButton label="Sign up with Google" />

      <p className="text-center text-[11px] leading-relaxed text-muted">
        By continuing with Google or email, you acknowledge that you agree to Feedi&apos;s{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="font-bold text-ink underline underline-offset-4 hover:decoration-ink"
        >
          Privacy Policy
        </Link>.
      </p>
    </div>
  );
}

