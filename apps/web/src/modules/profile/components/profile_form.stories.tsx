import type { Meta, StoryObj } from "@storybook/react";
import type { ProfileResponse } from "@feedio/api-client";
import React from "react";
import { ProfileForm } from "./profile_form";

const mockProfileFull: ProfileResponse = {
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

const mockProfileMinimal: ProfileResponse = {
  id: "prof_02",
  user_id: "usr_02",
  display_name: "Alex Rivera",
  avatar_url: null,
  job_title: null,
  timezone: "UTC",
  locale: "en",
  created_at: "2026-02-01T10:30:00Z",
};

const meta: Meta<typeof ProfileForm> = {
  title: "Profile/ProfileForm",
  component: ProfileForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Form for editing user profile information: display name, job title, timezone, and locale settings.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-paper rounded-2xl border border-line">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileForm>;

export const Populated: Story = {
  args: {
    profile: mockProfileFull,
  },
};

export const MinimalEmpty: Story = {
  args: {
    profile: mockProfileMinimal,
  },
};

export const InternationalUS: Story = {
  args: {
    profile: {
      ...mockProfileFull,
      display_name: "Sarah Jenkins",
      job_title: "Post Production Supervisor",
      timezone: "America/Los_Angeles",
      locale: "en",
    },
  },
};
