import Link from "next/link";

import { AuthShell, RegisterForm } from "@/modules/auth";

export default function RegisterPage() {
  return (
    <AuthShell
      description="Create your Feed.io account to start reviewing video cuts and collaborating with your team."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-bold text-ink underline underline-offset-4"
            href="/login"
          >
            Sign in
          </Link>
        </>
      }
      step="01 / CREATE ACCOUNT"
      title="Create your account"
    >
      <RegisterForm />
    </AuthShell>
  );
}
