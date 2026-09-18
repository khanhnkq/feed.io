import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AuthShell } from "./auth_shell";

const meta: Meta<typeof AuthShell> = {
  title: "Auth/AuthShell",
  component: AuthShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Two-column authentication layout shell featuring editorial branding, value propositions, and a centered interactive container.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AuthShell>;

export const Default: Story = {
  args: {
    step: "01 / PREVIEW",
    title: "Editorial Shell",
    description:
      "This is the layout shell used across all authentication, recovery, and onboarding screens.",
    children: (
      <div className="p-4 rounded-lg border border-dashed border-line text-center text-xs text-muted">
        Child component or form renders here.
      </div>
    ),
    footer: <span className="text-xs text-muted">Need help? Contact support@feed.io</span>,
  },
};
