import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { UsersTab } from "./users_tab";
import { mockAdminUsers } from "../lib/mock_data";

const meta: Meta<typeof UsersTab> = {
  title: "Admin/Tabs/UsersTab",
  component: UsersTab,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "User Governance tab with realtime search, role & status filtering, platform role alteration modal, and account suspension confirmation.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof UsersTab>;

export const Default: Story = {
  args: {
    initialUsers: mockAdminUsers,
  },
};

export const OnlySuperAdmins: Story = {
  args: {
    initialUsers: mockAdminUsers.filter((u) => u.platform_role === "super_admin"),
  },
};

export const SuspendedUsers: Story = {
  args: {
    initialUsers: mockAdminUsers.filter((u) => u.status === "suspended"),
  },
};

export const EmptyState: Story = {
  args: {
    initialUsers: [],
  },
};
