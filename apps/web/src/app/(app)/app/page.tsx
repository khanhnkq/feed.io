"use client";

import { useGetCurrentUser } from "@feedio/api-client";

import { AppShell } from "@/modules/navigation";
import { GlobalDashboardScreen, GlobalDashboardSkeleton } from "@/modules/organizations";

export default function GlobalDashboardPage() {
  const currentUser = useGetCurrentUser();
  if (!currentUser.data) {
    return <GlobalDashboardSkeleton />;
  }

  return (
    <AppShell context="global" user={currentUser.data}>
      <GlobalDashboardScreen />
    </AppShell>
  );
}
