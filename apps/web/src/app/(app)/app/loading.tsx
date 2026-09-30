import { AppShellSkeleton } from "@/modules/navigation";
import { GlobalDashboardSkeleton } from "@/modules/organizations";

export default function GlobalDashboardLoading() {
  return (
    <AppShellSkeleton>
      <GlobalDashboardSkeleton />
    </AppShellSkeleton>
  );
}
