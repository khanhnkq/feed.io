"use client";

import type { OrganizationInvitationResponse } from "@feedio/api-client";
import { Clock, Mail, Shield, ShieldAlert, User, XCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/ui";

interface InvitationsTableProps {
  invitations: OrganizationInvitationResponse[];
  canRevoke: boolean;
  onRevoke: (invitationId: string) => void;
  isRevoking: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "7 days";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "7 days";
  }
}

export function InvitationsTable({
  invitations,
  canRevoke,
  onRevoke,
  isRevoking,
}: InvitationsTableProps) {
  if (invitations.length === 0) {
    return (
      <TableEmptyState
        icon={Mail}
        title="No pending invitations"
        description="All team members have accepted their invitations or no invites are active."
      />
    );
  }

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

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invited Email</TableHead>
            <TableHead>Invited Role</TableHead>
            <TableHead>Invited By</TableHead>
            <TableHead>Expires</TableHead>
            {canRevoke && <TableHead align="right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const expiresDate = formatDate(invitation.expires_at);

            return (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#ecece5] text-ink">
                      <Mail className="size-4" strokeWidth={2} />
                    </div>
                    <span className="font-semibold text-ink">
                      {invitation.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                <TableCell className="text-[13px] text-muted">
                  {invitation.invited_by_name ?? "Organization Owner"}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                    <Clock className="size-3.5" />
                    {expiresDate}
                  </span>
                </TableCell>
                {canRevoke && (
                  <TableCell align="right">
                    <button
                      type="button"
                      onClick={() => onRevoke(invitation.id)}
                      disabled={isRevoking}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                      <XCircle className="size-3.5" />
                      Revoke
                    </button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
