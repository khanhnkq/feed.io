import type { Meta, StoryObj } from "@storybook/react";
import Link from "next/link";
import React from "react";
import { AuthShell } from "./auth_shell";
import { RegisterForm } from "./register_form";

const meta: Meta<typeof RegisterForm> = {
  title: "Auth/RegisterForm",
  component: RegisterForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Registration form for new creative team members with work email and strong password validation (min 12 characters).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Standalone: Story = {
  render: () => (
    <div className="max-w-md p-6 bg-paper rounded-2xl border border-line">
      <h2 className="text-xl font-bold mb-1">Create account</h2>
      <p className="text-xs text-muted mb-6">Start collaborating on creative cuts</p>
      <RegisterForm />
    </div>
  ),
};

export const InAuthShell: Story = {
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <AuthShell
      description="Create an account to start reviewing video cuts, sharing links and managing assets."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-bold text-ink underline underline-offset-4" href="/login">
            Sign in
          </Link>
        </>
      }
      step="01 / REGISTRATION"
      title="Create account"
    >
      <RegisterForm />
    </AuthShell>
  ),
};
