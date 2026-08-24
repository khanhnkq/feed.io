import type { Globe } from "lucide-react";

export type FlowMode = "all" | "ingest" | "review" | "storage";

export interface SystemNode {
  id: string;
  name: string;
  sub: string;
  tech: string;
  metric: string;
  icon: typeof Globe;
  badgeBg: string;
  activeInModes: FlowMode[];
}
