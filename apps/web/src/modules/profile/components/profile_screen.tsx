"use client";

import React, { useState } from "react";
import { Loader2, Shield, User } from "lucide-react";
import {
  useGetCurrentUser,
  type CurrentUserResponse,
} from "@feedio/api-client";
import { AppShell } from "@/modules/navigation";
import { Tabs } from "@/modules/ui/components/tabs";
import { ProfileTab } from "./profile_tab";
import { SecurityTab } from "@/modules/auth";

export interface ProfileScreenProps {
  initialTab?: "profile" | "security";
  withAppShell?: boolean;
  currentUserOverride?: CurrentUserResponse;
}

export function ProfileScreen({
  initialTab = "profile",
  withAppShell = true,
  currentUserOverride,
}: ProfileScreenProps) {
  const currentUserQuery = useGetCurrentUser({
    query: {
      enabled: !currentUserOverride,
      staleTime: 30000,
    },
  });
  const user = currentUserOverride || currentUserQuery.data;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const tabs = [
    {
      id: "profile",
      label: "Profile",
      icon: <User size={15} />,
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield size={15} />,
    },
  ];

  const content = (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col items-start gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-[clamp(36px,5vw,60px)] font-bold leading-[.96] tracking-[-.055em] text-ink">
              Account Settings
            </h1>
          </div>
          <p className="mt-[18px] text-[15px] text-muted">
            Manage your personal profile, display preferences, and account
            security.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      <div className="mt-8">
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </main>
  );

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted bg-paper">
        <Loader2 className="animate-spin text-muted" size={24} />
      </main>
    );
  }

  if (!withAppShell) {
    return <div className="min-h-screen bg-paper">{content}</div>;
  }

  return (
    <AppShell context="global" user={user}>
      {content}
    </AppShell>
  );
}
