import type { ReactNode } from "react";

import { AuthGate } from "@/modules/auth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
