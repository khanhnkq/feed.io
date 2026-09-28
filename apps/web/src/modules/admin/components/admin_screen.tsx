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
  useAdminOverview,
  useAdminUsers,
  useAdminOrganizations,
  useAdminAuditLogs,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useUpdateOrgQuotaMutation,
} from "../hooks/use_admin";
import type {
  AdminAuditLog,
  AdminOrganization,
  AdminPlatformRole,
  AdminUser,
  PlatformMetrics,
  SystemServiceHealth,
} from "../types";

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

  // Access Control Guard: user must be 'super_admin' or 'support'
  const isAuthorized =
    user?.platform_role === "super_admin" || user?.platform_role === "support";

  // Real data queries
  const overviewQuery = useAdminOverview({ enabled: isAuthorized });
  const usersQuery = useAdminUsers({ enabled: isAuthorized });
  const orgsQuery = useAdminOrganizations({ enabled: isAuthorized });
  const auditLogsQuery = useAdminAuditLogs({ enabled: isAuthorized });

  // Real mutations
  const updateUserRoleMutation = useUpdateUserRoleMutation();
  const updateUserStatusMutation = useUpdateUserStatusMutation();
  const updateOrgQuotaMutation = useUpdateOrgQuotaMutation();

  const handleRoleChange = async (userId: string, newRole: AdminPlatformRole) => {
    try {
      await updateUserRoleMutation.mutateAsync({
        userId,
        data: { new_role: newRole },
      });
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: "active" | "suspended",
  ) => {
    try {
      await updateUserStatusMutation.mutateAsync({
        userId,
        data: { new_status: newStatus },
      });
    } catch (err) {
      console.error("Failed to update user status:", err);
    }
  };

  const handleQuotaChange = async (orgId: string, newLimitBytes: number) => {
    try {
      await updateOrgQuotaMutation.mutateAsync({
        organizationId: orgId,
        data: { new_quota_bytes: newLimitBytes },
      });
    } catch (err) {
      console.error("Failed to update organization quota:", err);
    }
  };

  if (!user && currentUserQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-muted">
        <Loader2 className="animate-spin text-muted" size={24} />
      </main>
    );
  }

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
      count: usersQuery.data?.length,
      icon: <Users size={14} />,
    },
    {
      id: "organizations",
      label: "Organizations & Quotas",
      count: orgsQuery.data?.length,
      icon: <Building2 size={14} />,
    },
    {
      id: "audit-logs",
      label: "Security Audit Logs",
      count: auditLogsQuery.data?.length,
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
          overviewQuery.isLoading && !overviewQuery.data ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={28} />
            </div>
          ) : overviewQuery.data ? (
            <OverviewTab
              metrics={overviewQuery.data.metrics as unknown as PlatformMetrics}
              systemHealth={
                overviewQuery.data.system_health as unknown as SystemServiceHealth[]
              }
              currentUserRole={user.platform_role}
            />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
              Failed to load system overview metrics.
            </div>
          )
        )}
        {activeTab === "users" && (
          usersQuery.isLoading && !usersQuery.data ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={28} />
            </div>
          ) : usersQuery.data ? (
            <UsersTab
              initialUsers={usersQuery.data as unknown as AdminUser[]}
              onRoleChange={handleRoleChange}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
              Failed to load users list.
            </div>
          )
        )}
        {activeTab === "organizations" && (
          orgsQuery.isLoading && !orgsQuery.data ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={28} />
            </div>
          ) : orgsQuery.data ? (
            <OrganizationsTab
              initialOrganizations={
                orgsQuery.data as unknown as AdminOrganization[]
              }
              onQuotaChange={handleQuotaChange}
            />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
              Failed to load organizations list.
            </div>
          )
        )}
        {activeTab === "audit-logs" && (
          auditLogsQuery.isLoading && !auditLogsQuery.data ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-muted" size={28} />
            </div>
          ) : auditLogsQuery.data ? (
            <AuditLogsTab
              initialLogs={auditLogsQuery.data as unknown as AdminAuditLog[]}
            />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
              Failed to load security audit logs.
            </div>
          )
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
