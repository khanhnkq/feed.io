"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  FileText,
  History,
  Loader2,
  Lock,
  Server,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  useGetCurrentUser,
  type CurrentUserResponse,
} from "@feedio/api-client";
import { AppShell } from "../../navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  type TabItem,
} from "../../ui";
import { OverviewTab } from "./overview_tab";
import { UsersTab } from "./users_tab";
import { OrganizationsTab } from "./organizations_tab";
import { AuditLogsTab } from "./audit_logs_tab";
import {
  mockAdminAuditLogs,
  mockAdminOrganizations,
  mockAdminUsers,
  mockPlatformMetrics,
  mockSystemHealth,
} from "../lib/mock_data";

export interface AdminScreenProps {
  initialTab?: "overview" | "users" | "organizations" | "audit-logs";
  withAppShell?: boolean;
  currentUserOverride?: CurrentUserResponse;
}

export function AdminScreen({
  initialTab = "overview",
  withAppShell = true,
  currentUserOverride,
}: AdminScreenProps) {
  const currentUserQuery = useGetCurrentUser({
    query: {
      enabled: !currentUserOverride,
      staleTime: 30000,
    },
  });

  const user = currentUserOverride || currentUserQuery.data;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  if (!user && currentUserQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-muted">
        <Loader2 className="animate-spin text-muted" size={24} />
      </main>
    );
  }

  // Access Control Guard: user must be 'super_admin' or 'support'
  const isAuthorized =
    user?.platform_role === "super_admin" || user?.platform_role === "support";

  if (!isAuthorized) {
    const forbiddenContent = (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <Card className="border-line bg-surface p-8 shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-xl border border-line bg-paper text-red-600">
            <Lock size={22} />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-ink">
            Administrative Access Required
          </CardTitle>
          <CardDescription className="mt-2 text-xs leading-relaxed text-muted">
            The Platform Admin Panel is restricted to authorized platform administrators
            and support team members. Your account (
            <strong className="text-ink">{user?.email || "Current User"}</strong>)
            does not hold sufficient administrative privileges.
          </CardDescription>

          <div className="mt-6 flex justify-center">
            <Button variant="primary" size="md" href="/app" className="gap-2">
              <ArrowLeft size={16} />
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </main>
    );

    if (!withAppShell || !user) {
      return <div className="min-h-screen bg-paper">{forbiddenContent}</div>;
    }

    return (
      <AppShell context="global" user={user}>
        {forbiddenContent}
      </AppShell>
    );
  }

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "System Overview",
      icon: <Activity size={14} />,
    },
    {
      id: "users",
      label: "User Governance",
      count: mockAdminUsers.length,
      icon: <Users size={14} />,
    },
    {
      id: "organizations",
      label: "Organizations & Quotas",
      count: mockAdminOrganizations.length,
      icon: <Building2 size={14} />,
    },
    {
      id: "audit-logs",
      label: "Security Audit Logs",
      count: mockAdminAuditLogs.length,
      icon: <History size={14} />,
    },
  ];

  const adminRoleBadge =
    user.platform_role === "super_admin" ? (
      <Badge variant="lime" size="md" className="gap-1 font-bold">
        <ShieldAlert size={14} />
        SUPER ADMIN
      </Badge>
    ) : (
      <Badge
        variant="surface"
        size="md"
        className="gap-1 font-bold border-cyan/50 bg-cyan/20 text-ink"
      >
        <Shield size={14} />
        SUPPORT
      </Badge>
    );

  const mainContent = (
    <main
      id="admin-main-content"
      className="mx-auto max-w-[1500px] px-5 pb-16 pt-9 md:px-10 md:pb-20 md:pt-12"
    >
      {/* Admin Header */}
      <section className="flex flex-col items-start gap-4 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-[clamp(32px,4vw,52px)] font-bold leading-tight tracking-[-.05em] text-ink">
              Platform Administration
            </h1>
            {adminRoleBadge}
          </div>
          <p className="mt-3 text-sm text-muted">
            Global system health, storage quotas, user governance, and security audit logs.
          </p>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="mt-8">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="pills"
          size="md"
        />
      </div>

      {/* Tab Panels */}
      <div className="mt-8">
        {activeTab === "overview" && (
          <OverviewTab
            metrics={mockPlatformMetrics}
            systemHealth={mockSystemHealth}
          />
        )}
        {activeTab === "users" && (
          <UsersTab initialUsers={mockAdminUsers} />
        )}
        {activeTab === "organizations" && (
          <OrganizationsTab
            initialOrganizations={mockAdminOrganizations}
          />
        )}
        {activeTab === "audit-logs" && (
          <AuditLogsTab initialLogs={mockAdminAuditLogs} />
        )}
      </div>
    </main>
  );

  if (!withAppShell) {
    return <div className="min-h-screen bg-paper font-sans text-ink">{mainContent}</div>;
  }

  return (
    <AppShell context="global" user={user}>
      {mainContent}
    </AppShell>
  );
}
