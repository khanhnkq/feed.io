import Link from "next/link";

import { AuthShell, ForgotPasswordForm } from "@/modules/auth";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Enter your account email and we will send a time-limited recovery link."
      footer={<Link className="font-bold text-ink underline underline-offset-4" href="/login">Back to sign in</Link>}
      step="01 / RECOVERY"
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
