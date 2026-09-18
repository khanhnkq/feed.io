"use client";

import React, { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { useChangePassword } from "@feedio/api-client";
import {
  Button,
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { FormError } from "./form_controls";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const changePasswordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        setSavedSuccess(true);
        setErrorMessage(null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSavedSuccess(false), 4000);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(
          error?.response?.data?.detail ||
            "Failed to change password. Please verify current password.",
        );
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setErrorMessage(null);
    changePasswordMutation.mutate({
      data: {
        current_password: currentPassword,
        new_password: newPassword,
        revoke_other_sessions: revokeOthers,
      },
    });
  };

  return (
    <Card className="border-line bg-surface p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <CardBadge className="size-9 rounded-lg bg-lime font-mono text-xs font-bold text-ink">
              <KeyRound size={17} />
            </CardBadge>
            <div>
              <CardTitle as="h4" className="mt-0 text-sm font-bold tracking-tight text-ink">
                Change Password
              </CardTitle>
              <CardDescription className="text-xs text-muted mt-0.5">
                Must be at least 12 characters long.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {savedSuccess && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-lime/20 border border-lime/40 text-xs font-semibold text-ink">
            <Check size={16} className="text-ink shrink-0" />
            <span>Password changed successfully! Other sessions have been revoked.</span>
          </div>
        )}

        <FormError message={errorMessage || undefined} />

        <CardContent className="mt-0 flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="current_password"
              className="text-xs font-semibold text-ink"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="current_password"
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-lime/60"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition focus:outline-none"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="new_password"
              className="text-xs font-semibold text-ink"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="new_password"
                type={showNew ? "text" : "password"}
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-lime/60"
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition focus:outline-none"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm_password"
              className="text-xs font-semibold text-ink"
            >
              Confirm New Password
            </label>
            <input
              id="confirm_password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-lime/60"
              placeholder="Re-type new password"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={revokeOthers}
              onChange={(e) => setRevokeOthers(e.target.checked)}
              className="size-4 rounded border-line text-ink accent-ink focus:ring-2 focus:ring-lime/60 cursor-pointer"
            />
            <span className="text-xs text-muted font-medium select-none">
              Sign out of all other devices & active sessions
            </span>
          </label>
        </CardContent>

        <div className="flex justify-start pt-2 border-t border-line/60">
          <Button
            type="submit"
            variant="primary"
            size="md"
            pending={changePasswordMutation.isPending}
          >
            Update Password
          </Button>
        </div>
      </form>
    </Card>
  );
}
