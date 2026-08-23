import type { Metadata } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "@/shared/providers/query_provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feed.io — Video review platform",
  description: "Private, self-hosted review and approval for agency video teams.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-ink px-4 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0"
          href="#main-content"
        >
          Skip to main content
        </a>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
