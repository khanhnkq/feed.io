"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Filter,
  KeyRound,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
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
import { formatDate } from "../lib/formatters";
import type { AdminPlatformRole, AdminUser } from "../types";
import { ChangeRoleDialog } from "./change_role_dialog";
import { SuspendUserDialog } from "./suspend_user_dialog";

export interface UsersTabProps {
  initialUsers: AdminUser[];
  onRoleChange?: (userId: string, newRole: AdminPlatformRole) => void;
  onStatusChange?: (userId: string, newStatus: "active" | "suspended") => void;
}

export function UsersTab({
  initialUsers,
  onRoleChange,
  onStatusChange,
}: UsersTabProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Dialog states
  const [userForRoleChange, setUserForRoleChange] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<AdminPlatformRole>("user");
  const [userForStatusChange, setUserForStatusChange] = useState<AdminUser | null>(null);

  // Success toast notification
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        selectedRoleFilter === "all" || u.platform_role === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === "all" || u.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, selectedRoleFilter, selectedStatusFilter]);

  const handleOpenRoleDialog = (user: AdminUser) => {
    setUserForRoleChange(user);
    setTargetRole(user.platform_role);
  };

  const handleConfirmRoleChange = () => {
    if (!userForRoleChange) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userForRoleChange.id ? { ...u, platform_role: targetRole } : u,
      ),
    );
    onRoleChange?.(userForRoleChange.id, targetRole);
    setFeedbackMessage(
      `Role for ${userForRoleChange.display_name} updated to ${targetRole.toUpperCase()}`,
    );
    setUserForRoleChange(null);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleOpenStatusDialog = (user: AdminUser) => {
    setUserForStatusChange(user);
  };

  const handleConfirmStatusChange = () => {
    if (!userForStatusChange) return;
    const nextStatus =
      userForStatusChange.status === "active" ? "suspended" : "active";

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userForStatusChange.id ? { ...u, status: nextStatus } : u,
      ),
    );
    onStatusChange?.(userForStatusChange.id, nextStatus);
    setFeedbackMessage(
      `Account ${userForStatusChange.email} is now ${nextStatus.toUpperCase()}`,
    );
    setUserForStatusChange(null);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getRoleBadge = (role: AdminPlatformRole) => {
    switch (role) {
      case "super_admin":
        return (
          <Badge variant="lime" size="sm" className="gap-1 font-bold">
            <ShieldAlert size={12} />
            SUPER ADMIN
          </Badge>
        );
      case "support":
        return (
          <Badge
            variant="surface"
            size="sm"
            className="border-cyan/50 bg-cyan/15 font-bold text-ink gap-1"
          >
            <Shield size={12} className="text-muted" />
            SUPPORT
          </Badge>
        );
      case "user":
      default:
        return (
          <Badge variant="surface" size="sm">
            USER
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Toast feedback banner */}
      {feedbackMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-lime/20 px-4 py-3 text-xs font-bold text-ink transition-all">
          <CheckCircle2 size={16} className="text-ink shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users by name or email…"
        count={filteredUsers.length}
        itemLabelSingular="user"
        itemLabelPlural="users"
        borderTop={false}
        className="mt-0"
        leftControls={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-muted mr-1">Role:</span>
              {(["all", "super_admin", "support", "user"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`h-8 rounded-md px-2.5 text-xs font-semibold transition ${
                    selectedRoleFilter === r
                      ? "border border-ink bg-ink text-white"
                      : "border border-line bg-surface text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {r === "all"
                    ? "All Roles"
                    : r === "super_admin"
                    ? "Super Admin"
                    : r === "support"
                    ? "Support"
                    : "User"}
                </button>
              ))}
            </div>

            <div className="hidden h-5 w-px bg-line sm:block" />

            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-muted mr-1">Status:</span>
              {(["all", "active", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatusFilter(s)}
                  className={`h-8 rounded-md px-2.5 text-xs font-semibold transition ${
                    selectedStatusFilter === s
                      ? "border border-ink bg-ink text-white"
                      : "border border-line bg-surface text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {s === "all" ? "All" : s === "active" ? "Active" : "Suspended"}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* User Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Platform Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableEmptyState
                variant="embedded"
                colSpan={7}
                icon={Filter}
                title="No users match your criteria"
                description="Try adjusting your search terms or clearing the role and status filters."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setSelectedRoleFilter("all");
                      setSelectedStatusFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  {/* User Profile */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user.display_name}
                        src={user.avatar_url}
                        size="md"
                        tone={user.platform_role === "super_admin" ? "lime" : "dark"}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">
                          {user.display_name}
                        </div>
                        <div className="font-mono text-xs text-muted truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Platform Role Badge */}
                  <TableCell>{getRoleBadge(user.platform_role)}</TableCell>

                  {/* Account Status Badge */}
                  <TableCell>
                    <Badge
                      variant={user.status === "active" ? "success" : "danger"}
                      size="sm"
                    >
                      {user.status === "active" ? "ACTIVE" : "SUSPENDED"}
                    </Badge>
                  </TableCell>

                  {/* Workspaces Count */}
                  <TableCell className="font-mono text-xs text-ink font-bold">
                    {user.organizations_count}
                  </TableCell>

                  {/* Registered Date */}
                  <TableCell className="text-xs text-muted">
                    {formatDate(user.created_at)}
                  </TableCell>

                  {/* Last Active */}
                  <TableCell className="text-xs text-muted">
                    {formatDate(user.last_active_at)}
                  </TableCell>

                  {/* Actions dropdown */}
                  <TableCell align="right">
                    <Dropdown size="sm">
                      <DropdownTrigger hideChevron aria-label="User actions">
                        <MoreHorizontal size={15} />
                      </DropdownTrigger>
                      <DropdownMenu align="right">
                        <DropdownItem
                          icon={<Shield size={14} />}
                          onClick={() => handleOpenRoleDialog(user)}
                        >
                          Change Platform Role
                        </DropdownItem>
                        <DropdownItem
                          icon={<KeyRound size={14} />}
                          onClick={() => {
                            setFeedbackMessage(
                              `Password reset link triggered for ${user.email}`,
                            );
                            setTimeout(() => setFeedbackMessage(null), 3500);
                          }}
                        >
                          Send Password Reset
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          danger
                          icon={
                            user.status === "active" ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )
                          }
                          onClick={() => handleOpenStatusDialog(user)}
                        >
                          {user.status === "active"
                            ? "Suspend Account"
                            : "Reactivate Account"}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Change Role Dialog */}
      <ChangeRoleDialog
        user={userForRoleChange}
        targetRole={targetRole}
        onTargetRoleChange={setTargetRole}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setUserForRoleChange(null)}
      />

      {/* Suspend / Reactivate Confirmation Dialog */}
      <SuspendUserDialog
        user={userForStatusChange}
        onConfirm={handleConfirmStatusChange}
        onClose={() => setUserForStatusChange(null)}
      />
    </div>
  );
}
