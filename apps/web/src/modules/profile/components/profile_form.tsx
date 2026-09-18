"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import {
  useUpdateMyProfile,
  getGetMyProfileQueryKey,
  type ProfileResponse,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { FormError } from "@/modules/auth/components/form_controls";

interface ProfileFormProps {
  profile: ProfileResponse;
}

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

export function ProfileForm({ profile }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [jobTitle, setJobTitle] = useState(profile.job_title || "");
  const [timezone, setTimezone] = useState(profile.timezone || "UTC");
  const [locale, setLocale] = useState(profile.locale || "en");

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMutation = useUpdateMyProfile({
    mutation: {
      onSuccess: () => {
        setSavedSuccess(true);
        setErrorMessage(null);
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        setTimeout(() => setSavedSuccess(false), 3000);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(
          error?.response?.data?.detail || "Failed to update profile.",
        );
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMessage("Display name must be at least 2 characters.");
      return;
    }

    setErrorMessage(null);
    updateMutation.mutate({
      data: {
        display_name: displayName.trim(),
        job_title: jobTitle.trim() || null,
        timezone: timezone || "UTC",
        locale: locale || "en",
      },
    });
  };

  return (
    <Card className="border-line bg-surface p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle as="h4" className="mt-0 text-base font-bold tracking-tight text-ink">
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs text-muted mt-0.5">
              Update your display name, role, and localization settings.
            </CardDescription>
          </div>
        </CardHeader>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-lime/20 border border-lime/40 text-xs font-semibold text-ink">
              <Check size={16} className="text-ink shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <FormError message={errorMessage || undefined} />

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="display_name"
                  className="text-xs font-semibold text-ink"
                >
                  Display Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="display_name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-lime/60"
                  placeholder="Your public name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="job_title"
                  className="text-xs font-semibold text-ink"
                >
                  Job Title / Role
                </label>
                <input
                  id="job_title"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-lime/60"
                  placeholder="e.g. Video Editor, Colorist"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="timezone"
                className="text-xs font-semibold text-ink"
              >
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-lime/60 cursor-pointer"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="locale"
                className="text-xs font-semibold text-ink"
              >
                Language / Locale
              </label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-paper text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-lime/60 cursor-pointer"
              >
                <option value="en">English (US)</option>
                <option value="vi">Tiếng Việt (VN)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-start pt-2 border-t border-line/60">
            <Button
              type="submit"
              variant="primary"
              size="md"
              pending={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
  );
}
