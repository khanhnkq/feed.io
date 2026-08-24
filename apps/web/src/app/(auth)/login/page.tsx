import Link from "next/link";

import { AuthShell, LoginForm } from "@/modules/auth";

export default function LoginPage() {
  return (
    <AuthShell
      description="Sign in to your account to review media assets, manage projects and collaborate with your team."
      footer={
        <>
          New to Feed.io?{" "}
          <Link
            className="font-bold text-ink underline underline-offset-4"
            href="/register"
          >
            Create account
          </Link>
        </>
      }
      step="01 / SIGN IN"
      title="Welcome back"
    >
      <LoginForm />
    </AuthShell>
  );
}
