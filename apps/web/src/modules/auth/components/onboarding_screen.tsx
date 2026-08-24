"use client";

import {
  type ApiError,
  getGetCurrentUserQueryKey,
  useCreateOrganization,
  useGetCurrentUser,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect } from "react";

import { AuthShell } from "./auth_shell";
import { Field, FormError, SubmitButton } from "./form_controls";
import { getPostAuthRoute } from "../lib/post_auth_route";

export function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser({ query: { retry: false } });
  const createOrganization = useCreateOrganization<ApiError>({
    mutation: {
      onSuccess: async (organization) => {
        await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        router.replace(`/app/organizations/${organization.slug}`);
      },
    },
  });

  useEffect(() => {
    if (currentUser.isError) {
      router.replace("/login");
    } else if (currentUser.data?.has_organization) {
      router.replace(getPostAuthRoute(true));
    }
  }, [currentUser.data, currentUser.isError, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createOrganization.mutate({ data: { name: String(data.get("name")) } });
  }

  if (currentUser.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-sm text-muted">
        Preparing onboarding…
      </main>
    );
  }

  if (currentUser.isError || currentUser.data.has_organization) return null;

  return (
    <AuthShell
      description="Give your organization a name to organize your projects, creative assets and team members."
      step="03 / ORGANIZATION"
      title={`Welcome, ${currentUser.data.display_name}`}
    >
      <form className="grid gap-5" onSubmit={submit}>
        <Field
          autoFocus
          hint="For example: North Studio or Acme Creative."
          id="organization-name"
          label="Agency or organization name"
          name="name"
          required
        />
        <FormError message={createOrganization.error?.message} />
        <SubmitButton pending={createOrganization.isPending}>Create organization</SubmitButton>
      </form>
    </AuthShell>
  );
}
