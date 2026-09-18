import type { Meta, StoryObj } from "@storybook/react";
import { getGetMyProfileQueryKey, type ProfileResponse } from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ProfileTab } from "./profile_tab";

const mockProfile: ProfileResponse = {
  id: "prof_01",
  user_id: "usr_01",
  display_name: "Khanh Nguyen",
  avatar_url:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  job_title: "Senior Colorist",
  timezone: "Asia/Ho_Chi_Minh",
  locale: "vi",
  created_at: "2026-01-15T08:00:00Z",
};

function createMockQueryClient(initialProfile?: ProfileResponse | null, isError = false) {
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

  const queryKey = getGetMyProfileQueryKey();

  if (isError) {
    client.setQueryData(queryKey, () => {
      throw new Error("Network error loading profile");
    });
  } else if (initialProfile !== undefined) {
    client.setQueryData(queryKey, initialProfile);
  }

  return client;
}

const meta: Meta<typeof ProfileTab> = {
  title: "Profile/ProfileTab",
  component: ProfileTab,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Complete Profile settings tab combining the AvatarUploader and the ProfileForm with query state handling.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileTab>;

export const Loaded: Story = {
  render: () => {
    const client = createMockQueryClient(mockProfile);
    return (
      <QueryClientProvider client={client}>
        <div className="p-8 max-w-4xl bg-surface/30 rounded-2xl border border-line/60">
          <ProfileTab />
        </div>
      </QueryClientProvider>
    );
  },
};

export const WithoutAvatar: Story = {
  render: () => {
    const client = createMockQueryClient({
      ...mockProfile,
      display_name: "Sarah Jenkins",
      avatar_url: null,
      job_title: "Assistant Editor",
    });
    return (
      <QueryClientProvider client={client}>
        <div className="p-8 max-w-4xl bg-surface/30 rounded-2xl border border-line/60">
          <ProfileTab />
        </div>
      </QueryClientProvider>
    );
  },
};

export const ErrorState: Story = {
  render: () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Set query with error status
    client.setQueryDefaults(getGetMyProfileQueryKey(), {
      queryFn: () => Promise.reject(new Error("Failed to load profile")),
    });

    return (
      <QueryClientProvider client={client}>
        <div className="p-8 max-w-4xl bg-surface/30 rounded-2xl border border-line/60">
          <ProfileTab />
        </div>
      </QueryClientProvider>
    );
  },
};
