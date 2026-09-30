import { AppShellSkeleton } from "@/modules/navigation";
import { ProfileScreenSkeleton } from "@/modules/profile";

export default function SettingsLoading() {
  return (
    <AppShellSkeleton>
      <ProfileScreenSkeleton />
    </AppShellSkeleton>
  );
}
