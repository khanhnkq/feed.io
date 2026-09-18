import type { Meta, StoryObj } from "@storybook/react";
import {
  getGetCurrentUserQueryKey,
  getGetMyProfileQueryKey,
  getListMyInvitationsQueryKey,
  getListUserSessionsQueryKey,
  type CurrentUserResponse,
  type ProfileResponse,
  type PaginatedResponseSessionResponse,
} from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { UNREAD_COUNT_QUERY_KEY } from "@/modules/notifications/hooks/use_notifications";
import { ProfileScreen } from "./profile_screen";

const mockCurrentUser: CurrentUserResponse = {
  id: "usr_01",
  email: "khanh@creativecut.studio",
  email_verified: true,
  has_organization: true,
};

const mockProfileWithAvatar: ProfileResponse = {
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

const mockProfileWithoutAvatar: ProfileResponse = {
  id: "prof_02",
  user_id: "usr_01",
  display_name: "Alex Rivera",
  avatar_url: null,
  job_title: "Video Editor",
  timezone: "UTC",
  locale: "en",
  created_at: "2026-02-01T10:30:00Z",
};

const mockSessionsList: PaginatedResponseSessionResponse = {
  items: [
    {
      id: "sess_01",
      user_agent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0",
      ip_address: "118.69.12.34",
      current: true,
    },
    {
      id: "sess_02",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36",
      ip_address: "14.161.20.55",
      current: false,
    },
    {
      id: "sess_03",
      user_agent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148",
      ip_address: "118.69.12.34",
      current: false,
    },
  ],
  next_cursor: null,
  has_more: false,
};

function createMockSettingsQueryClient(
  profile: ProfileResponse = mockProfileWithAvatar,
  user: CurrentUserResponse = mockCurrentUser,
) {
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
  client.setQueryData(getListMyInvitationsQueryKey(), { items: [] });
  client.setQueryData(getListUserSessionsQueryKey(), mockSessionsList);
  client.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);

  return client;
}

const meta: Meta<typeof ProfileScreen> = {
  title: "Profile/ProfileScreen",
  component: ProfileScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full Account Settings & Profile screen showing AppShell navigation, header tabs (Profile / Security), interactive circular avatar editor, and live profile preview card.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileScreen>;

export const ProfileTab_WithAvatar: Story = {
  render: () => {
    const client = createMockSettingsQueryClient(mockProfileWithAvatar);
    return (
      <QueryClientProvider client={client}>
        <ProfileScreen initialTab="profile" />
      </QueryClientProvider>
    );
  },
};

export const ProfileTab_WithoutAvatar: Story = {
  render: () => {
    const client = createMockSettingsQueryClient(mockProfileWithoutAvatar);
    return (
      <QueryClientProvider client={client}>
        <ProfileScreen initialTab="profile" />
      </QueryClientProvider>
    );
  },
};

export const SecurityTab_Active: Story = {
  render: () => {
    const client = createMockSettingsQueryClient(mockProfileWithAvatar);
    return (
      <QueryClientProvider client={client}>
        <ProfileScreen initialTab="security" />
      </QueryClientProvider>
    );
  },
};

export const Standalone_ContentOnly: Story = {
  render: () => {
    const client = createMockSettingsQueryClient(mockProfileWithAvatar);
    return (
      <QueryClientProvider client={client}>
        <ProfileScreen initialTab="profile" withAppShell={false} />
      </QueryClientProvider>
    );
  },
};
