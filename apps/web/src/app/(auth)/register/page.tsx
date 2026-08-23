import Link from "next/link";

import { AuthShell, RegisterForm } from "@/modules/auth";

export default function RegisterPage() {
  return (
    <AuthShell
      description="Create an agency workspace. We will verify your email before activating the account."
      footer={<>Already have an account? <Link className="font-bold text-ink underline underline-offset-4" href="/login">Sign in</Link></>}
      step="01 / CREATE ACCOUNT"
      title="Start your workspace"
    >
      <RegisterForm />
    </AuthShell>
  );
}
