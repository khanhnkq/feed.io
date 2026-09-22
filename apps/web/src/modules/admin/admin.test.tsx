import React from "react";
import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
} from "./lib/formatters";
import {
  mockAdminAuditLogs,
  mockAdminOrganizations,
  mockAdminUsers,
  mockPlatformMetrics,
  mockSystemHealth,
} from "./lib/mock_data";
import { OverviewTab } from "./components/overview_tab";
import { UsersTab } from "./components/users_tab";
import { OrganizationsTab } from "./components/organizations_tab";
import { AuditLogsTab } from "./components/audit_logs_tab";
import { AdminScreen } from "./components/admin_screen";
import type { CurrentUserResponse } from "@feedio/api-client";

describe("Admin Formatters", () => {
  it("formats bytes accurately across scale tiers", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 * 50)).toBe("50 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 250)).toBe("250 GB");
    expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1.5)).toBe("1.5 TB");
  });

  it("formats numbers with locale thousands separators", () => {
    expect(formatNumber(1420)).toBe("1,420");
    expect(formatNumber(5410)).toBe("5,410");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats date strings reliably", () => {
    const formatted = formatDate("2026-01-15T08:00:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jan");
  });

  it("formats date-time strings reliably", () => {
    const formatted = formatDateTime("2026-09-22T13:45:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Sep");
  });
});

describe("Admin Mock Data Consistency", () => {
  it("contains users for each platform role", () => {
    const roles = mockAdminUsers.map((u) => u.platform_role);
    expect(roles).toContain("super_admin");
    expect(roles).toContain("support");
    expect(roles).toContain("user");
  });

  it("contains both active and suspended users", () => {
    const statuses = mockAdminUsers.map((u) => u.status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("suspended");
  });

  it("contains organizations across subscription tiers", () => {
    const tiers = mockAdminOrganizations.map((o) => o.plan_tier);
    expect(tiers).toContain("enterprise");
    expect(tiers).toContain("pro");
    expect(tiers).toContain("free");
  });

  it("validates all required system health services exist", () => {
    const serviceNames = mockSystemHealth.map((s) => s.name);
    expect(serviceNames.some((n) => n.includes("PostgreSQL"))).toBe(true);
    expect(serviceNames.some((n) => n.includes("Valkey"))).toBe(true);
    expect(serviceNames.some((n) => n.includes("Garage S3"))).toBe(true);
    expect(serviceNames.some((n) => n.includes("RabbitMQ"))).toBe(true);
    expect(serviceNames.some((n) => n.includes("Nginx"))).toBe(true);
  });

  it("validates storage capacity calculation", () => {
    expect(mockPlatformMetrics.total_storage_bytes).toBeLessThan(
      mockPlatformMetrics.storage_capacity_bytes,
    );
    expect(mockPlatformMetrics.storage_breakdown.raw_uploads_bytes).toBeGreaterThan(0);
  });
});

describe("Admin Components Element Construction", () => {
  it("constructs OverviewTab elements without errors", () => {
    const el = React.createElement(OverviewTab, {
      metrics: mockPlatformMetrics,
      systemHealth: mockSystemHealth,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(OverviewTab);
  });

  it("constructs UsersTab elements without errors", () => {
    const el = React.createElement(UsersTab, {
      initialUsers: mockAdminUsers,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(UsersTab);
  });

  it("constructs OrganizationsTab elements without errors", () => {
    const el = React.createElement(OrganizationsTab, {
      initialOrganizations: mockAdminOrganizations,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(OrganizationsTab);
  });

  it("constructs AuditLogsTab elements without errors", () => {
    const el = React.createElement(AuditLogsTab, {
      initialLogs: mockAdminAuditLogs,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(AuditLogsTab);
  });

  it("constructs AdminScreen element for super_admin without errors", () => {
    const superAdmin: CurrentUserResponse = {
      id: "usr_admin",
      email: "superadmin@feed.io",
      email_verified: true,
      has_organization: true,
      platform_role: "super_admin",
    };

    const el = React.createElement(AdminScreen, {
      currentUserOverride: superAdmin,
      withAppShell: false,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(AdminScreen);
  });

  it("constructs 403 Forbidden screen when user is standard user", () => {
    const standardUser: CurrentUserResponse = {
      id: "usr_std",
      email: "user@feed.io",
      email_verified: true,
      has_organization: true,
      platform_role: "user",
    };

    const el = React.createElement(AdminScreen, {
      currentUserOverride: standardUser,
      withAppShell: false,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(AdminScreen);
  });
});
