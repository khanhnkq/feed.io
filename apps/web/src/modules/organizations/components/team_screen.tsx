"use client";

import { useState } from "react";
import {
  useGetCurrentUser,
  useListOrganizationInvitations,
  useListOrganizationMembers,
  useRevokeInvitation,
  type OrganizationMemberResponse,
} from "@feedio/api-client";
import { Mail, Shield, UserPlus, Users } from "lucide-react";

import { Button, CardBadge } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";
import { ChangeRoleDialog } from "./change_role_dialog";
import { InvitationsTable } from "./invitations_table";
import { InviteMemberDialog } from "./invite_member_dialog";
import { MembersTable } from "./members_table";
import { RemoveMemberDialog } from "./remove_member_dialog";

export function TeamScreen() {
  const organization = useOrganization();
  const currentUserQuery = useGetCurrentUser();
  const currentUserId = currentUserQuery.data?.id;

  const [activeTab, setActiveTab] = useState<"members" | "invitations">(
    "members",
  );
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [roleEditMember, setRoleEditMember] = useState<{
    userId: string;
    displayName: string;
    email: string;
    currentRole: "owner" | "admin" | "member";
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    displayName: string;
    email: string;
  } | null>(null);

  const membersQuery = useListOrganizationMembers(organization.id, undefined, {
    query: { refetchOnWindowFocus: false },
  });

  const members = membersQuery.data?.items ?? [];
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const currentUserRole = currentMember?.organization_role ?? "member";
  const canManageTeam =
    currentUserRole === "owner" || currentUserRole === "admin";

  const invitationsQuery = useListOrganizationInvitations(
    organization.id,
    undefined,
    {
      query: {
        enabled: canManageTeam,
        refetchOnWindowFocus: false,
      },
    },
  );

  const invitations = invitationsQuery.data?.items ?? [];

  const revokeMutation = useRevokeInvitation({
    mutation: {
      onSuccess: () => {
        invitationsQuery.refetch();
      },
    },
  });

  const handleRevoke = (invitationId: string) => {
    revokeMutation.mutate({
      organizationId: organization.id,
      invitationId,
    });
  };

  const adminCount = members.filter(
    (m) => m.organization_role === "owner" || m.organization_role === "admin",
  ).length;

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-[clamp(32px,4vw,48px)] font-bold leading-tight tracking-[-.05em] text-ink">
            Team & Permissions
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Manage agency collaborators, assign role-based access, and oversee
            pending invitations.
          </p>
        </div>

        {canManageTeam && (
          <Button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <UserPlus className="size-4" />
            Invite team member
          </Button>
        )}
      </section>

      {/* Overview Stat Cards with CardBadge */}
      <section
        className="mt-8 grid gap-4 sm:grid-cols-3"
        aria-label="Team metrics summary"
      >
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-5 transition">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
              Total Members
            </span>
            <p className="mt-2 text-[28px] font-extrabold tracking-tight text-ink">
              {members.length}
            </p>
          </div>
          <CardBadge>
            <Users size={18} aria-hidden strokeWidth={2} />
          </CardBadge>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-5 transition">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
              Admins & Owners
            </span>
            <p className="mt-2 text-[28px] font-extrabold tracking-tight text-ink">
              {adminCount}
            </p>
          </div>
          <CardBadge>
            <Shield size={18} aria-hidden strokeWidth={2} />
          </CardBadge>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-5 transition">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
              Pending Invites
            </span>
            <p className="mt-2 text-[28px] font-extrabold tracking-tight text-ink">
              {invitations.length}
            </p>
          </div>
          <CardBadge>
            <Mail size={18} aria-hidden strokeWidth={2} />
          </CardBadge>
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-10 flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`border-b-2 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === "members"
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Active Members ({members.length})
        </button>

        {canManageTeam && (
          <button
            type="button"
            onClick={() => setActiveTab("invitations")}
            className={`border-b-2 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === "invitations"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Pending Invitations ({invitations.length})
          </button>
        )}
      </div>

      {/* Content */}
      <section className="mt-6">
        {activeTab === "members" ? (
          <MembersTable
            members={members}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onChangeRole={(member: OrganizationMemberResponse) =>
              setRoleEditMember({
                userId: member.user_id,
                displayName: member.display_name,
                email: member.email,
                currentRole: member.organization_role as
                  | "owner"
                  | "admin"
                  | "member",
              })
            }
            onRemoveMember={(member: OrganizationMemberResponse) =>
              setRemoveTarget({
                userId: member.user_id,
                displayName: member.display_name,
                email: member.email,
              })
            }
          />
        ) : (
          <InvitationsTable
            invitations={invitations}
            canRevoke={canManageTeam}
            onRevoke={handleRevoke}
            isRevoking={revokeMutation.isPending}
          />
        )}
      </section>

      {/* Modals */}
      <InviteMemberDialog
        organizationId={organization.id}
        isOpen={isInviteOpen}
        currentUserRole={currentUserRole}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          membersQuery.refetch();
          invitationsQuery.refetch();
        }}
      />

      <ChangeRoleDialog
        organizationId={organization.id}
        member={roleEditMember}
        isOpen={roleEditMember !== null}
        onClose={() => setRoleEditMember(null)}
        onSuccess={() => {
          membersQuery.refetch();
        }}
      />

      <RemoveMemberDialog
        organizationId={organization.id}
        member={removeTarget}
        isSelf={removeTarget?.userId === currentUserId}
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onSuccess={() => {
          membersQuery.refetch();
        }}
      />
    </main>
  );
}
