import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AuditLogsTab } from "./audit_logs_tab";
import { mockAdminAuditLogs } from "../lib/mock_data";

const meta: Meta<typeof AuditLogsTab> = {
  title: "Admin/Tabs/AuditLogsTab",
  component: AuditLogsTab,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Security Audit Logs tab tracking all administrative role alterations, quota expansions, account suspensions, and 429 Rate Limit blocks.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AuditLogsTab>;

export const RecentActivity: Story = {
  args: {
    initialLogs: mockAdminAuditLogs,
  },
};

export const SecurityBlocksOnly: Story = {
  args: {
    initialLogs: mockAdminAuditLogs.filter((l) => l.status === "blocked"),
  },
};

export const EmptyState: Story = {
  args: {
    initialLogs: [],
  },
};
