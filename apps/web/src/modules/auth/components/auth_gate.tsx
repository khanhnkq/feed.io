"use client";

import { useGetCurrentUser } from "@feedio/api-client";
import type { ReactNode } from "react";

import { DashboardShell } from "@/modules/projects";

import { LoginScreen } from "./login_screen";

export function AuthGate({ children }: { children: ReactNode }) {
  const currentUser = useGetCurrentUser({
    query: { retry: false, staleTime: 60_000 },
  });

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
        <p className="m-0 text-[13px] text-muted">Opening your workspace…</p>
      </main>
    );
  }

  if (currentUser.isError) {
    return <LoginScreen />;
  }

  return <DashboardShell user={currentUser.data}>{children}</DashboardShell>;
}
