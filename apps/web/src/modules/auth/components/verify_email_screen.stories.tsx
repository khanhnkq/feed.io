import type { Meta, StoryObj } from "@storybook/react";
import { VerifyEmailScreen } from "./verify_email_screen";

const meta: Meta<typeof VerifyEmailScreen> = {
  title: "Auth/VerifyEmailScreen",
  component: VerifyEmailScreen,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Email verification screen informing the user to check their email inbox or showing token verification status.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof VerifyEmailScreen>;

export const CheckInboxWithEmail: Story = {
  args: {
    email: "creator@motioncraft.studio",
  },
};

export const CheckInboxGeneric: Story = {
  args: {},
};
