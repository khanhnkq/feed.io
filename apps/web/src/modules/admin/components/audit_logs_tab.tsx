"use client";

import React, { useMemo, useState } from "react";
import {
  AlertOctagon,
  Building2,
  Calendar,
  Clock,
  HardDrive,
  History,
  Shield,
  ShieldAlert,
  UserX,
} from "lucide-react";
import {
  Badge,
  Button,
  FilterToolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui";
import { formatDateTime } from "../lib/formatters";
import type { AdminAuditLog, AuditLogAction, AuditLogStatus } from "../types";

export interface AuditLogsTabProps {
  initialLogs: AdminAuditLog[];
}

export function AuditLogsTab({ initialLogs }: AuditLogsTabProps) {
  const [logs] = useState<AdminAuditLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.actor_email.toLowerCase().includes(search.toLowerCase()) ||
        log.target_name.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.ip_address.includes(search);

      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const getActionIcon = (action: AuditLogAction) => {
    switch (action) {
      case "USER_ROLE_CHANGED":
        return <Shield className="size-3.5 text-ink" />;
      case "STORAGE_QUOTA_INCREASED":
        return <HardDrive className="size-3.5 text-lime" />;
      case "RATE_LIMIT_BLOCKED":
        return <AlertOctagon className="size-3.5 text-red-600" />;
      case "USER_SUSPENDED":
        return <UserX className="size-3.5 text-red-600" />;
      case "ORGANIZATION_CREATED":
        return <Building2 className="size-3.5 text-muted" />;
      default:
        return <Clock className="size-3.5 text-muted" />;
    }
  };

  const getStatusBadge = (status: AuditLogStatus) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="success" size="sm">
            SUCCESS
          </Badge>
        );
      case "blocked":
        return (
          <Badge variant="danger" size="sm">
            BLOCKED
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="surface" size="sm" className="border-amber-400 bg-amber-50 text-amber-900 font-bold">
            WARNING
          </Badge>
        );
      default:
        return <Badge size="sm">{String(status).toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Filter and Search Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search audit events by actor, target, IP, or details…"
        count={filteredLogs.length}
        itemLabelSingular="event"
        itemLabelPlural="events"
        borderTop={false}
        className="mt-0"
        leftControls={
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-muted mr-1">Status:</span>
            {(["all", "success", "blocked", "warning"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`h-8 rounded-md px-2.5 text-xs font-semibold transition ${
                  statusFilter === s
                    ? "border border-ink bg-ink text-white"
                    : "border border-line bg-surface text-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {s === "all"
                  ? "All Statuses"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      {/* Audit Log Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Source IP</TableHead>
              <TableHead align="right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableEmptyState
                variant="embedded"
                colSpan={7}
                icon={History}
                title="No audit events found"
                description="Try clearing your search query or changing the status filter."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  {/* Timestamp */}
                  <TableCell className="font-mono text-xs text-muted whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </TableCell>

                  {/* Actor */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-xs truncate max-w-[160px]">
                        {log.actor_email}
                      </span>
                      {log.actor_role === "super_admin" && (
                        <Badge variant="lime" size="sm" className="text-[9px] px-1 py-0.5">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-ink">
                      {getActionIcon(log.action)}
                      <span>{log.action}</span>
                    </div>
                  </TableCell>

                  {/* Target Entity */}
                  <TableCell className="text-xs font-medium text-ink">
                    {log.target_name}
                  </TableCell>

                  {/* Details */}
                  <TableCell className="text-xs text-muted max-w-[260px] truncate">
                    {log.details}
                  </TableCell>

                  {/* Source IP */}
                  <TableCell className="font-mono text-xs text-muted">
                    {log.ip_address}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell align="right">
                    {getStatusBadge(log.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
