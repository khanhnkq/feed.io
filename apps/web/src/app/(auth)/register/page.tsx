import Link from "next/link";

import { AuthShell, RegisterForm } from "@/modules/auth";

export default function RegisterPage() {
  return (
    <AuthShell
      description="Create your account first. After email verification and sign-in, we will guide you through organization setup."
      footer={<>Already have an account? <Link className="font-bold text-ink underline underline-offset-4" href="/login">Sign in</Link></>}
      step="01 / CREATE ACCOUNT"
      title="Create your account"
    >
      <RegisterForm />
    </AuthShell>
  );
}
