import { AppShellSkeleton } from "@/modules/navigation";
import { InvitationsSkeleton } from "@/modules/organizations";

export default function InvitationsLoading() {
  return (
    <AppShellSkeleton>
      <InvitationsSkeleton />
    </AppShellSkeleton>
  );
}
