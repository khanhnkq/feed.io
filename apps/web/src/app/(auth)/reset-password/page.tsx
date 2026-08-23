import { AuthShell, ResetPasswordForm } from "@/modules/auth";

interface ResetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <AuthShell
      description="Choose a new password. Completing this step signs out every existing session."
      step="02 / NEW PASSWORD"
      title="Secure your account"
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
