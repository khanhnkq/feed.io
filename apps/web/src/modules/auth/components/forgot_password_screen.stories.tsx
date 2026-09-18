import type { Meta, StoryObj } from "@storybook/react";
import { ForgotPasswordScreen } from "./forgot_password_screen";

const meta: Meta<typeof ForgotPasswordScreen> = {
  title: "Auth/ForgotPasswordScreen",
  component: ForgotPasswordScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Forgot password request screen allowing users to receive a password reset link by entering their work email.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ForgotPasswordScreen>;

export const Default: Story = {};
