"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useGetMyProfile } from "@feedio/api-client";
import { Card } from "@/modules/ui";
import { FormError } from "@/modules/auth/components/form_controls";
import { AvatarUploader } from "./avatar_uploader";
import { ProfileForm } from "./profile_form";
import { ProfileTabSkeleton } from "./profile_skeleton";

export function ProfileTab() {
  const { data: profile, isLoading, error } = useGetMyProfile();

  if (isLoading) {
    return <ProfileTabSkeleton />;
  }

  if (error || !profile) {
    return (
      <Card className="border-line bg-surface p-6 shadow-sm max-w-3xl">
        <FormError message="Failed to load profile. Please refresh or try again later." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <AvatarUploader
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        jobTitle={profile.job_title}
      />

      <ProfileForm profile={profile} />
    </div>
  );
}
