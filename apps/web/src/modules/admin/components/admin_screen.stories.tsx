import type { Meta, StoryObj } from "@storybook/react";
import {
  getGetCurrentUserQueryKey,
  getGetMyProfileQueryKey,
  getListMyInvitationsQueryKey,
  type CurrentUserResponse,
  type ProfileResponse,
} from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { UNREAD_COUNT_QUERY_KEY } from "../../notifications/hooks/use_notifications";
import { AdminScreen } from "./admin_screen";

const mockSuperAdminUser: CurrentUserResponse = {
  id: "usr_01",
  email: "khanh@creativecut.studio",
  email_verified: true,
  has_organization: true,
  platform_role: "super_admin",
};

const mockSupportUser: CurrentUserResponse = {
  id: "usr_02",
  email: "sarah.support@feed.io",
  email_verified: true,
  has_organization: true,
  platform_role: "support",
};

const mockStandardUser: CurrentUserResponse = {
  id: "usr_03",
  email: "regular.creator@filmlab.io",
  email_verified: true,
  has_organization: true,
  platform_role: "user",
};

const mockProfile: ProfileResponse = {
  id: "prof_admin",
  user_id: "usr_01",
  display_name: "Khanh Nguyen (Super Admin)",
  avatar_url:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  job_title: "Principal Engineer",
  timezone: "Asia/Ho_Chi_Minh",
  locale: "vi",
  created_at: "2026-01-15T08:00:00Z",
};

function createMockAdminQueryClient(user: CurrentUserResponse = mockSuperAdminUser) {
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
  client.setQueryData(getGetMyProfileQueryKey(), {
    ...mockProfile,
    user_id: user.id,
    display_name: user.email.split("@")[0],
  });
  client.setQueryData(getListMyInvitationsQueryKey(), { items: [] });
  client.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);

  return client;
}

const meta: Meta<typeof AdminScreen> = {
  title: "Admin/AdminScreen",
  component: AdminScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full Platform Administration Panel with Global Navigation, system overview, user governance, storage quotas, and security audit logs.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AdminScreen>;

export const SuperAdmin_FullAccess: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSuperAdminUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen currentUserOverride={mockSuperAdminUser} />
      </QueryClientProvider>
    );
  },
};

export const SupportAdmin_View: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSupportUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen currentUserOverride={mockSupportUser} />
      </QueryClientProvider>
    );
  },
};

export const ForbiddenUser_AccessDenied: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockStandardUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen currentUserOverride={mockStandardUser} />
      </QueryClientProvider>
    );
  },
};

export const Standalone_ContentOnly: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSuperAdminUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen
          currentUserOverride={mockSuperAdminUser}
          withAppShell={false}
        />
      </QueryClientProvider>
    );
  },
};

export const UsersTab_Active: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSuperAdminUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen
          currentUserOverride={mockSuperAdminUser}
          initialTab="users"
        />
      </QueryClientProvider>
    );
  },
};

export const OrganizationsTab_Active: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSuperAdminUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen
          currentUserOverride={mockSuperAdminUser}
          initialTab="organizations"
        />
      </QueryClientProvider>
    );
  },
};

export const AuditLogsTab_Active: Story = {
  render: () => {
    const client = createMockAdminQueryClient(mockSuperAdminUser);
    return (
      <QueryClientProvider client={client}>
        <AdminScreen
          currentUserOverride={mockSuperAdminUser}
          initialTab="audit-logs"
        />
      </QueryClientProvider>
    );
  },
};
