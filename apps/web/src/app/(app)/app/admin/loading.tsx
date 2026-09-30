import { AppShellSkeleton } from "@/modules/navigation";
import { AdminScreenSkeleton } from "@/modules/admin";

export default function AdminLoading() {
  return (
    <AppShellSkeleton>
      <AdminScreenSkeleton />
    </AppShellSkeleton>
  );
}
