import type { Meta, StoryObj } from "@storybook/react";
import {
  getGetCurrentUserQueryKey,
  getGetMyProfileQueryKey,
  type CurrentUserResponse,
  type ProfileResponse,
} from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { OnboardingScreen } from "./onboarding_screen";

const mockCurrentUser: CurrentUserResponse = {
  id: "usr_01",
  email: "khanh@creativecut.studio",
  email_verified: true,
  has_organization: false,
};

const mockInitialProfile: ProfileResponse = {
  id: "prof_01",
  user_id: "usr_01",
  display_name: "Khanh Nguyen",
  avatar_url: null,
  job_title: null,
  timezone: "Asia/Ho_Chi_Minh",
  locale: "vi",
  created_at: "2026-01-01T00:00:00Z",
};

function createOnboardingQueryClient(user = mockCurrentUser, profile = mockInitialProfile) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });

  client.setQueryData(getGetCurrentUserQueryKey(), user);
  client.setQueryData(getGetMyProfileQueryKey(), profile);

  return client;
}

const meta: Meta<typeof OnboardingScreen> = {
  title: "Auth/OnboardingScreen",
  component: OnboardingScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "2-step onboarding wizard for newly verified users: Step 1 sets up creative profile (avatar, name, role), Step 2 initializes creative organization / workspace.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingScreen>;

export const Step1_ProfileSetup: Story = {
  render: () => {
    const client = createOnboardingQueryClient();
    return (
      <QueryClientProvider client={client}>
        <OnboardingScreen disableRedirect initialStep={1} />
      </QueryClientProvider>
    );
  },
};

export const Step1_WithExistingAvatar: Story = {
  render: () => {
    const client = createOnboardingQueryClient(mockCurrentUser, {
      ...mockInitialProfile,
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      job_title: "Senior Colorist",
    });
    return (
      <QueryClientProvider client={client}>
        <OnboardingScreen disableRedirect initialStep={1} />
      </QueryClientProvider>
    );
  },
};

export const Step2_WorkspaceSetup: Story = {
  render: () => {
    const client = createOnboardingQueryClient();
    return (
      <QueryClientProvider client={client}>
        <OnboardingScreen disableRedirect initialStep={2} />
      </QueryClientProvider>
    );
  },
};
