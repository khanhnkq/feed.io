"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import React, { useState } from "react";

import { FormError } from "@/modules/auth/components/form_controls";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";

interface GuestPassphraseGateProps {
  title: string;
  onVerify: (passphrase: string) => Promise<void>;
  isVerifying: boolean;
  verifyError: string | null;
}

export function GuestPassphraseGate({
  title,
  onVerify,
  isVerifying,
  verifyError,
}: GuestPassphraseGateProps) {
  const [enteredPassphrase, setEnteredPassphrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPassphrase.trim()) return;
    onVerify(enteredPassphrase);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
      <Card className="w-full max-w-md border-line bg-surface p-8 shadow-[7px_7px_0_#e2e3dc]">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-[6px_2px] bg-lime font-black text-ink text-xs border border-ink/20 shadow-sm">
              F
            </div>
            <span className="text-sm font-extrabold tracking-tight">
              feed.io
            </span>
          </div>
          <Badge
            variant="outline"
            size="sm"
            className="gap-1 text-[11px] py-0.5"
          >
            <Lock size={12} className="text-ink" />
            <span>Protected Review</span>
          </Badge>
        </CardHeader>

        <CardTitle className="text-xl font-bold tracking-tight text-ink mt-6">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted mt-2">
          This media asset is password protected. Enter the passphrase provided
          by the creator to review.
        </CardDescription>

        <CardContent className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {verifyError && <FormError message={verifyError} />}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter passphrase..."
                value={enteredPassphrase}
                onChange={(e) => setEnteredPassphrase(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted hover:text-ink transition-colors p-1"
                aria-label={
                  showPassword ? "Hide passphrase" : "Show passphrase"
                }
              >
                {showPassword ? (
                  <EyeOff size={15} className="text-ink" />
                ) : (
                  <Eye size={15} className="text-ink" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              pending={isVerifying}
              disabled={isVerifying || !enteredPassphrase.trim()}
            >
              Access Review Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
