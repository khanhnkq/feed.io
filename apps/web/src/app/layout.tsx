import type { Metadata } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "@/shared/providers/query_provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feed.io — Video review workspace",
  description: "Private, self-hosted review and approval for agency video teams.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
