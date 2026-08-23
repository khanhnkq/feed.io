import type { ReactNode } from "react";

import { AuthGate } from "@/modules/auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
