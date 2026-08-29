"use client";

import type { OrganizationMemberResponse } from "@feedio/api-client";
import { Shield, ShieldAlert, User, Users } from "lucide-react";

import {
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/ui";
import {
  canManageMemberRole,
  canRemoveMember,
} from "../lib/member_permissions";

interface MembersTableProps {
  members: OrganizationMemberResponse[];
  currentUserId?: string;
  currentUserRole: "owner" | "admin" | "member";
  onChangeRole: (member: OrganizationMemberResponse) => void;
  onRemoveMember: (member: OrganizationMemberResponse) => void;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function MembersTable({
  members,
  currentUserId,
  currentUserRole,
  onChangeRole,
  onRemoveMember,
}: MembersTableProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-[#f7f8f1] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
            <span className="grid size-4 place-items-center rounded bg-lime text-[10px] text-ink">
              <ShieldAlert className="size-3" />
            </span>
            Owner
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-[#f7f8f1] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
            <span className="grid size-4 place-items-center rounded bg-[#ecece5] text-[10px] text-ink">
              <Shield className="size-3" />
            </span>
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-[#f7f8f1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="grid size-4 place-items-center rounded bg-[#ecece5] text-[10px] text-muted">
              <User className="size-3" />
            </span>
            Member
          </span>
        );
    }
  };

  if (members.length === 0) {
    return (
      <TableEmptyState
        icon={Users}
        title="No team members found"
        description="Invite your team members to begin collaborating on projects."
      />
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined Date</TableHead>
            <TableHead align="right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const canEditRole = canManageMemberRole(currentUserRole, isSelf);
            const canRemove = canRemoveMember(
              currentUserRole,
              member.organization_role,
              isSelf
            );

            const formattedDate = formatDate(member.joined_at);

            return (
              <TableRow key={member.user_id}>
                <TableCell>
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      initials={getInitials(member.display_name)}
                      tone={isSelf ? "lime" : "dark"}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {member.display_name}
                        </span>
                        {isSelf && (
                          <span className="rounded bg-[#ecece5] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(member.organization_role)}</TableCell>
                <TableCell className="text-[13px] text-muted">
                  {formattedDate}
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    {canEditRole && (
                      <button
                        type="button"
                        onClick={() => onChangeRole(member)}
                        className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-ink hover:bg-[#f7f8f1] focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        Change Role
                      </button>
                    )}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(member)}
                        className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                          isSelf
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border-line bg-white text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        }`}
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
