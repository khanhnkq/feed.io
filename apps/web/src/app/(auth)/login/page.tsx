import Link from "next/link";

import { AuthShell, LoginForm } from "@/modules/auth";

export default function LoginPage() {
  return (
    <AuthShell
      description="Sign in with your Feed.io account. Access and refresh tokens stay in secure HttpOnly cookies."
      footer={<>New to Feed.io? <Link className="font-bold text-ink underline underline-offset-4" href="/register">Create your workspace</Link></>}
      step="01 / SIGN IN"
      title="Welcome back"
    >
      <LoginForm />
    </AuthShell>
  );
}
