import type { ReactNode } from "react";

import { GuestGate } from "@/modules/auth";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestGate>{children}</GuestGate>;
}
