import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { OrganizationsTab } from "./organizations_tab";
import { mockAdminOrganizations } from "../lib/mock_data";

const meta: Meta<typeof OrganizationsTab> = {
  title: "Admin/Tabs/OrganizationsTab",
  component: OrganizationsTab,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Organizations & Quotas tab with plan tier filtering, S3 storage consumption progress bars, and quota alteration modal.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrganizationsTab>;

export const Default: Story = {
  args: {
    initialOrganizations: mockAdminOrganizations,
  },
};

export const EnterpriseOnly: Story = {
  args: {
    initialOrganizations: mockAdminOrganizations.filter(
      (o) => o.plan_tier === "enterprise",
    ),
  },
};

export const NearLimitOrgs: Story = {
  args: {
    initialOrganizations: mockAdminOrganizations.filter(
      (o) => (o.storage_used_bytes / o.storage_limit_bytes) >= 0.85,
    ),
  },
};

export const EmptyState: Story = {
  args: {
    initialOrganizations: [],
  },
};
