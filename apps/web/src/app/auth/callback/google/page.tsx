import { GoogleCallbackScreen } from "@/modules/auth";

interface GoogleCallbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GoogleCallbackPage({
  searchParams,
}: GoogleCallbackPageProps) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const errorDescription =
    typeof params.error_description === "string"
      ? params.error_description
      : undefined;

  return (
    <GoogleCallbackScreen
      code={code}
      error={error}
      errorDescription={errorDescription}
      state={state}
    />
  );
}
