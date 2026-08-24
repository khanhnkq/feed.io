"use client";

import { useGetCurrentUser } from "@feedio/api-client";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useGetCurrentUser({
    query: { retry: false, staleTime: 60_000 },
  });

  useEffect(() => {
    if (currentUser.isError) {
      if (pathname && pathname.startsWith("/app") && pathname !== "/app") {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else {
        router.replace("/login");
      }
    } else if (currentUser.data && !currentUser.data.has_organization) {
      router.replace("/onboarding");
    }
  }, [currentUser.data, currentUser.isError, pathname, router]);

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
        <p className="m-0 text-[13px] text-muted">Opening your organization…</p>
      </main>
    );
  }

  if (currentUser.isError || !currentUser.data.has_organization) return null;

  return <>{children}</>;
}
