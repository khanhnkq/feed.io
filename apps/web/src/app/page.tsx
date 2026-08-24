"use client";

import { useGetCurrentUser } from "@feedio/api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getPostAuthRoute } from "@/modules/auth/lib/post_auth_route";

export default function HomePage() {
  const router = useRouter();
  const currentUser = useGetCurrentUser({
    query: { retry: false, staleTime: 60_000 },
  });

  useEffect(() => {
    if (currentUser.isError) {
      router.replace("/login");
    } else if (currentUser.data) {
      router.replace(getPostAuthRoute(currentUser.data.has_organization));
    }
  }, [currentUser.data, currentUser.isError, router]);

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
