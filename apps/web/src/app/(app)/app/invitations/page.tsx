"use client";

import { useGetCurrentUser } from "@feedio/api-client";

import { AppShell } from "@/modules/navigation";
import { UserInvitationsScreen } from "@/modules/organizations";

export default function UserInvitationsPage() {
  const currentUser = useGetCurrentUser();
  if (!currentUser.data) return null;

  return (
    <AppShell context="global" user={currentUser.data}>
      <UserInvitationsScreen />
    </AppShell>
  );
}
