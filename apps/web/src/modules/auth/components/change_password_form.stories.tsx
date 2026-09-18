import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ChangePasswordForm } from "./change_password_form";

const meta: Meta<typeof ChangePasswordForm> = {
  title: "Auth/Security/ChangePasswordForm",
  component: ChangePasswordForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Form for updating the user password with requirement validation (min 12 characters, confirmation match) and an option to revoke all other active sessions.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-paper rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChangePasswordForm>;

export const Default: Story = {};
