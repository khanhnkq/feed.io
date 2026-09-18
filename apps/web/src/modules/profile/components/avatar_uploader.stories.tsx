import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AvatarUploader } from "./avatar_uploader";

const meta: Meta<typeof AvatarUploader> = {
  title: "Profile/AvatarUploader",
  component: AvatarUploader,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Avatar uploader component with circular image preview, file size and format validation (JPEG, PNG, WebP, GIF <= 5MB), and hint placed underneath the container.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AvatarUploader>;

export const WithAvatar: Story = {
  args: {
    displayName: "Khanh Nguyen",
    jobTitle: "Senior Colorist",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  render: (args) => (
    <div className="max-w-xl p-6">
      <AvatarUploader {...args} />
    </div>
  ),
};

export const WithoutAvatar: Story = {
  args: {
    displayName: "Sarah Jenkins",
    jobTitle: "Assistant Editor",
    avatarUrl: null,
  },
  render: (args) => (
    <div className="max-w-xl p-6">
      <AvatarUploader {...args} />
    </div>
  ),
};

export const MinimalProfile: Story = {
  args: {
    displayName: "Alex Rivera",
    jobTitle: null,
    avatarUrl: null,
  },
  render: (args) => (
    <div className="max-w-xl p-6">
      <AvatarUploader {...args} />
    </div>
  ),
};

