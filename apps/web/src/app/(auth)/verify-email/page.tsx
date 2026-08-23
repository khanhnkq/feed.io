import { AuthShell, VerifyEmailForm } from "@/modules/auth";

interface VerifyEmailPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <AuthShell
      description="Verification protects your agency workspace and confirms where account recovery messages should go."
      step="02 / VERIFY EMAIL"
      title={token ? "Activating your account" : "Check your inbox"}
    >
      <VerifyEmailForm email={email} token={token} />
    </AuthShell>
  );
}
