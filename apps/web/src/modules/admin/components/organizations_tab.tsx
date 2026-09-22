"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  HardDrive,
  PenSquare,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FilterToolbar,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui";
import { formatBytes, formatDate } from "../lib/formatters";
import type { AdminOrganization, AdminOrganizationPlan } from "../types";

export interface OrganizationsTabProps {
  initialOrganizations: AdminOrganization[];
  onQuotaChange?: (orgId: string, newLimitBytes: number) => void;
}

const QUOTA_PRESETS = [
  { label: "20 GB (Free Tier)", bytes: 20 * 1024 * 1024 * 1024 },
  { label: "100 GB (Starter)", bytes: 100 * 1024 * 1024 * 1024 },
  { label: "250 GB (Pro Tier)", bytes: 250 * 1024 * 1024 * 1024 },
  { label: "500 GB (Studio)", bytes: 500 * 1024 * 1024 * 1024 },
  { label: "1 TB (Enterprise)", bytes: 1024 * 1024 * 1024 * 1024 },
  { label: "2 TB (Enterprise High)", bytes: 2048 * 1024 * 1024 * 1024 },
];

export function OrganizationsTab({
  initialOrganizations,
  onQuotaChange,
}: OrganizationsTabProps) {
  const [organizations, setOrganizations] =
    useState<AdminOrganization[]>(initialOrganizations);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Quota dialog state
  const [editingOrg, setEditingOrg] = useState<AdminOrganization | null>(null);
  const [selectedQuotaBytes, setSelectedQuotaBytes] = useState<number>(0);

  // Success toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase()) ||
        org.owner_email.toLowerCase().includes(search.toLowerCase());

      const matchesTier =
        tierFilter === "all" || org.plan_tier === tierFilter;

      return matchesSearch && matchesTier;
    });
  }, [organizations, search, tierFilter]);

  const handleOpenQuotaDialog = (org: AdminOrganization) => {
    setEditingOrg(org);
    setSelectedQuotaBytes(org.storage_limit_bytes);
  };

  const handleSaveQuota = () => {
    if (!editingOrg) return;
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === editingOrg.id
          ? { ...o, storage_limit_bytes: selectedQuotaBytes }
          : o,
      ),
    );
    onQuotaChange?.(editingOrg.id, selectedQuotaBytes);
    setToastMessage(
      `Updated storage quota for ${editingOrg.name} to ${formatBytes(selectedQuotaBytes)}`,
    );
    setEditingOrg(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getTierBadge = (tier: AdminOrganizationPlan) => {
    switch (tier) {
      case "enterprise":
        return (
          <Badge variant="lime" size="sm" className="font-bold gap-1">
            <Sparkles size={11} />
            ENTERPRISE
          </Badge>
        );
      case "pro":
        return (
          <Badge variant="ink" size="sm">
            PRO
          </Badge>
        );
      case "free":
      default:
        return (
          <Badge variant="surface" size="sm">
            FREE
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Toast feedback banner */}
      {toastMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-lime/20 px-4 py-3 text-xs font-bold text-ink transition-all">
          <CheckCircle2 size={16} className="text-ink shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search organizations by name, slug, or owner…"
        count={filteredOrgs.length}
        itemLabelSingular="organization"
        itemLabelPlural="organizations"
        borderTop={false}
        className="mt-0"
        leftControls={
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-muted mr-1">Plan Tier:</span>
            {(["all", "enterprise", "pro", "free"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`h-8 rounded-md px-2.5 text-xs font-semibold transition ${
                  tierFilter === t
                    ? "border border-ink bg-ink text-white"
                    : "border border-line bg-surface text-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {t === "all"
                  ? "All Tiers"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      {/* Organizations Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="min-w-[220px]">
                Garage S3 Storage Quota
              </TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead align="right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableEmptyState
                variant="embedded"
                colSpan={7}
                icon={Building2}
                title="No organizations found"
                description="Try clearing your search query or choosing a different plan tier."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setTierFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              filteredOrgs.map((org) => {
                const usagePercent = Math.min(
                  100,
                  Math.round(
                    (org.storage_used_bytes / org.storage_limit_bytes) * 100,
                  ),
                );
                const isHighUsage = usagePercent >= 85;

                return (
                  <TableRow key={org.id}>
                    {/* Organization info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg border border-line bg-paper text-ink font-bold">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-ink">{org.name}</div>
                          <div className="font-mono text-xs text-muted">
                            {org.slug} • {org.owner_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Plan Tier */}
                    <TableCell>{getTierBadge(org.plan_tier)}</TableCell>

                    {/* Storage Quota Progress */}
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-ink">
                            {formatBytes(org.storage_used_bytes)}
                          </span>
                          <span className="text-muted">
                            / {formatBytes(org.storage_limit_bytes)} ({usagePercent}%)
                          </span>
                        </div>
                        <ProgressBar
                          value={usagePercent}
                          variant={isHighUsage ? "danger" : "lime"}
                          size="sm"
                        />
                      </div>
                    </TableCell>

                    {/* Projects Count */}
                    <TableCell className="font-mono text-xs font-bold text-ink">
                      {org.projects_count}
                    </TableCell>

                    {/* Members Count */}
                    <TableCell className="font-mono text-xs font-bold text-ink">
                      {org.members_count}
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-muted">
                      {formatDate(org.created_at)}
                    </TableCell>

                    {/* Manage Quota Button */}
                    <TableCell align="right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleOpenQuotaDialog(org)}
                      >
                        <PenSquare size={13} />
                        Edit Quota
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Adjust Storage Quota Dialog */}
      <Dialog
        isOpen={Boolean(editingOrg)}
        onClose={() => setEditingOrg(null)}
        size="md"
        ariaLabelledBy="quota-dialog-title"
      >
        <DialogCloseButton onClick={() => setEditingOrg(null)} />
        <DialogHeader>
          <DialogEyebrow>Storage Infrastructure</DialogEyebrow>
          <DialogTitle id="quota-dialog-title">
            Adjust Storage Quota
          </DialogTitle>
          <DialogDescription>
            Update maximum S3 Garage bucket capacity for{" "}
            <strong>{editingOrg?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-line bg-paper p-3 text-xs">
            <div className="flex justify-between text-muted">
              <span>Current Usage:</span>
              <strong className="text-ink font-mono">
                {editingOrg && formatBytes(editingOrg.storage_used_bytes)}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">
              Select Capacity Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUOTA_PRESETS.map((preset) => (
                <button
                  key={preset.bytes}
                  type="button"
                  onClick={() => setSelectedQuotaBytes(preset.bytes)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    selectedQuotaBytes === preset.bytes
                      ? "border-ink bg-lime text-ink font-bold shadow-sm"
                      : "border-line bg-surface text-ink hover:bg-paper"
                  }`}
                >
                  <span className="text-xs">{preset.label}</span>
                  <HardDrive size={14} className="shrink-0 text-muted" />
                </button>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingOrg(null)}
          >
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveQuota}>
            Apply Quota
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
