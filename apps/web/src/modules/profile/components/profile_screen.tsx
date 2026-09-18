"use client";

import React, { useState } from "react";
import { Loader2, Shield, User } from "lucide-react";
import { useGetCurrentUser, type CurrentUserResponse } from "@feedio/api-client";
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
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1 pb-6 border-b border-line">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Account Settings
        </h1>
        <p className="text-xs text-muted">
          Manage your personal profile, display preferences, and account security.
        </p>
      </div>

      <div className="py-6">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      <div className="pt-2">
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted bg-paper">
        <Loader2 className="animate-spin text-muted" size={24} />
      </main>
    );
  }

  if (!withAppShell) {
    return <main className="min-h-screen bg-paper">{content}</main>;
  }

  return (
    <AppShell context="global" user={user}>
      {content}
    </AppShell>
  );
}
