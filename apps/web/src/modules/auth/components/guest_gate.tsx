"use client";

import { useGetCurrentUser } from "@feedio/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect } from "react";

import { getPostAuthRedirectUrl } from "../lib/post_auth_route";

function GuestGateContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useGetCurrentUser({
    query: { retry: false, staleTime: 60_000 },
  });

  const redirectParam = searchParams.get("redirect");

  useEffect(() => {
    if (currentUser.data) {
      const destination = getPostAuthRedirectUrl(
        currentUser.data.has_organization,
        redirectParam,
      );
      router.replace(destination);
    }
  }, [currentUser.data, redirectParam, router]);

  if (currentUser.isPending) {
    return (
      <main
        id="main-content"
        className="grid min-h-screen place-items-center content-center gap-[18px]"
        aria-busy="true"
        aria-label="Checking your session"
      >
        <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
          F
        </span>
        <span className="h-0.5 w-20 animate-pulse bg-ink" aria-hidden="true" />
      </main>
    );
  }

  if (currentUser.data) return null;

  return <>{children}</>;
}

export function GuestGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GuestGateContent>{children}</GuestGateContent>
    </Suspense>
  );
}
