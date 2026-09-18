import type { Meta, StoryObj } from "@storybook/react";
import { ResetPasswordScreen } from "./reset_password_screen";

const meta: Meta<typeof ResetPasswordScreen> = {
  title: "Auth/ResetPasswordScreen",
  component: ResetPasswordScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Password reset screen accepting a new password with confirmation, or showing an invalid link warning if the token is missing or expired.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResetPasswordScreen>;

export const ValidTokenForm: Story = {
  args: {
    token: "mock-valid-reset-token-xyz123",
  },
};

export const MissingOrExpiredToken: Story = {
  args: {
    token: undefined,
  },
};
