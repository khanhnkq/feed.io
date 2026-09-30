"use client";

import { useGetCurrentUser, useGetMyProfile, type CurrentUserResponse } from "@feedio/api-client";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRealtimeUser } from "@/modules/collaboration";

function AuthenticatedRealtimeListener({
  user,
  children,
}: {
  user: CurrentUserResponse;
  children: ReactNode;
}) {
  const profileQuery = useGetMyProfile();
  const displayName = profileQuery.data?.display_name || user.email.split("@")[0];

  useRealtimeUser({
    userId: user.id,
    userName: displayName,
    userEmail: user.email ?? undefined,
    userAvatar: profileQuery.data?.avatar_url ?? undefined,
  });

  return <>{children}</>;
}

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

  if (currentUser.isError || (currentUser.data && !currentUser.data.has_organization)) {
    return null;
  }

  if (currentUser.data) {
    return (
      <AuthenticatedRealtimeListener user={currentUser.data}>
        {children}
      </AuthenticatedRealtimeListener>
    );
  }

  return <>{children}</>;
}
