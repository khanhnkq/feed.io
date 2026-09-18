"use client";

import {
  type ApiError,
  getGetCurrentUserQueryKey,
  getGetMyProfileQueryKey,
  useCreateOrganization,
  useGetCurrentUser,
  useGetMyProfile,
  useUpdateMyProfile,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AvatarUploader } from "@/modules/profile";
import { AuthShell } from "./auth_shell";
import { Field, FormError, SubmitButton } from "./form_controls";
import { getPostAuthRoute } from "../lib/post_auth_route";

export interface OnboardingScreenProps {
  initialStep?: 1 | 2;
  disableRedirect?: boolean;
}

export function OnboardingScreen({
  initialStep = 1,
  disableRedirect = false,
}: OnboardingScreenProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(initialStep);

  const currentUser = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 30000,
    },
  });
  const profileQuery = useGetMyProfile({
    query: {
      retry: false,
      staleTime: 30000,
    },
  });

  const profile = profileQuery.data;
  const initialDisplayName =
    profile?.display_name || currentUser.data?.email?.split("@")[0] || "Creative";

  const [displayNameInput, setDisplayNameInput] = useState(
    profile?.display_name || initialDisplayName,
  );
  const [jobTitleInput, setJobTitleInput] = useState(profile?.job_title || "");

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayNameInput(profile.display_name);
    }
    if (profile?.job_title) {
      setJobTitleInput(profile.job_title);
    }
  }, [profile?.display_name, profile?.job_title]);

  const updateProfileMutation = useUpdateMyProfile<ApiError>({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        setStep(2);
      },
      onError: () => {
        if (disableRedirect) {
          setStep(2);
        }
      },
    },
  });

  const createOrganization = useCreateOrganization<ApiError>({
    mutation: {
      onSuccess: async (organization) => {
        await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        router.replace(`/app/organizations/${organization.slug}`);
      },
    },
  });

  useEffect(() => {
    if (disableRedirect) return;

    if (currentUser.isError) {
      router.replace("/login");
    } else if (currentUser.data?.has_organization) {
      router.replace(getPostAuthRoute(true));
    }
  }, [currentUser.data, currentUser.isError, disableRedirect, router]);

  if (!disableRedirect && (currentUser.isPending || profileQuery.isPending)) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-sm text-muted">
        Preparing onboarding…
      </main>
    );
  }

  if (!disableRedirect && (currentUser.isError || currentUser.data?.has_organization)) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-sm text-muted">
        Redirecting…
      </main>
    );
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = displayNameInput.trim();
    const jobTitle = jobTitleInput.trim();

    updateProfileMutation.mutate({
      data: {
        display_name: displayName || initialDisplayName,
        job_title: jobTitle || undefined,
      },
    });
  }

  function handleOrganizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createOrganization.mutate({ data: { name: String(data.get("name")) } });
  }

  if (step === 1) {
    return (
      <AuthShell
        description="Set up your profile so your team and collaborators know who's reviewing and giving feedback."
        step="01 / PROFILE SETUP"
        title="Your Profile"
      >
        <form className="grid gap-5" onSubmit={handleProfileSubmit}>
          <AvatarUploader
            displayName={displayNameInput || initialDisplayName}
            avatarUrl={profile?.avatar_url}
            jobTitle={jobTitleInput}
          />
          <Field
            autoFocus
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            hint="Your full name or how teammates recognize you."
            id="profile-display-name"
            label="Display name"
            name="display_name"
            required
          />
          <Field
            value={jobTitleInput}
            onChange={(e) => setJobTitleInput(e.target.value)}
            id="profile-job-title"
            label="Job title"
            name="job_title"
            placeholder="e.g. Senior Video Editor, Colorist"
          />
          <FormError message={updateProfileMutation.error?.message} />
          <SubmitButton pending={updateProfileMutation.isPending}>
            Continue to Workspace
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="Give your organization a name to organize your projects, creative assets and team members."
      footer={
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition"
          onClick={() => setStep(1)}
          type="button"
        >
          <ArrowLeft size={14} /> Back to Profile setup
        </button>
      }
      step="02 / WORKSPACE"
      title="Create workspace"
    >
      <form className="grid gap-5" onSubmit={handleOrganizationSubmit}>
        <Field
          autoFocus
          hint="For example: North Studio or Acme Creative."
          id="organization-name"
          label="Organization name"
          name="name"
          required
        />
        <FormError message={createOrganization.error?.message} />
        <SubmitButton pending={createOrganization.isPending}>
          Complete Setup
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
