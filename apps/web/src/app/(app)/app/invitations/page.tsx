"use client";

import { useGetCurrentUser } from "@feedio/api-client";

import { AppShell, AppShellSkeleton } from "@/modules/navigation";
import { InvitationsSkeleton, UserInvitationsScreen } from "@/modules/organizations";

export default function UserInvitationsPage() {
  const currentUser = useGetCurrentUser();
  if (!currentUser.data) {
    return (
      <AppShellSkeleton>
        <InvitationsSkeleton />
      </AppShellSkeleton>
    );
  }

  return (
    <AppShell context="global" user={currentUser.data}>
      <UserInvitationsScreen />
    </AppShell>
  );
}
