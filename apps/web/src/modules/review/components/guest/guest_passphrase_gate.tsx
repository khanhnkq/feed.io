"use client";

import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import React, { useState } from "react";

import { Badge, Button } from "@/modules/ui";

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
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-[6px_6px_0_#11130f] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-[6px_2px] bg-lime font-black text-ink text-xs border border-ink/20 shadow-sm">
              F
            </div>
            <span className="text-sm font-extrabold tracking-tight">feed.io</span>
          </div>
          <Badge variant="outline" size="sm" className="gap-1 text-[11px] py-0.5">
            <Lock size={12} className="text-ink" />
            <span>Protected Review</span>
          </Badge>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="text-xs text-muted">
            This media asset is password protected. Enter the passphrase provided by the creator to review.
          </p>
        </div>

        {verifyError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{verifyError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter passphrase..."
              value={enteredPassphrase}
              onChange={(e) => setEnteredPassphrase(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-muted hover:text-ink transition-colors"
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
            disabled={isVerifying || !enteredPassphrase.trim()}
          >
            {isVerifying ? "Verifying..." : "Access Review Workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
