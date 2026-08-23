import type { ReactNode } from "react";

import { DashboardShell } from "@/modules/projects";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
