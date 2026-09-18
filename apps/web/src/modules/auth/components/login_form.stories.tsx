import type { Meta, StoryObj } from "@storybook/react";
import Link from "next/link";
import React from "react";
import { AuthShell } from "./auth_shell";
import { LoginForm } from "./login_form";

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "User login form with email & password authentication, validation, and redirect handling.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Standalone: Story = {
  render: () => (
    <div className="max-w-md p-6 bg-paper rounded-2xl border border-line">
      <h2 className="text-xl font-bold mb-1">Sign in</h2>
      <p className="text-xs text-muted mb-6">Enter your studio credentials</p>
      <LoginForm />
    </div>
  ),
};

export const InAuthShell: Story = {
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <AuthShell
      description="Enter your studio credentials to access your creative reviews, notes and assets."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link className="font-bold text-ink underline underline-offset-4" href="/register">
            Create an account
          </Link>
        </>
      }
      step="01 / AUTHENTICATION"
      title="Sign in"
    >
      <LoginForm />
    </AuthShell>
  ),
};
