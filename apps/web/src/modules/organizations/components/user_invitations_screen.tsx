"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getListMyInvitationsQueryKey,
  useAcceptMyInvitation,
  useDeclineMyInvitation,
  useListMyInvitations,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Shield,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import { Button, TableEmptyState } from "@/modules/ui";

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

export function UserInvitationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const invitationsQuery = useListMyInvitations(undefined, {
    query: { retry: false },
  });
  const invitations = invitationsQuery.data?.items ?? [];

  const acceptMutation = useAcceptMyInvitation({
    mutation: {
      onSuccess: async (data) => {
        setErrorMessage(null);
        setSuccessMessage(`Joined ${data.name} successfully! Redirecting...`);
        await queryClient.invalidateQueries({
          queryKey: getListMyInvitationsQueryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: ["/api/v1/organizations"],
        });
        setTimeout(() => {
          router.push(`/app/organizations/${data.slug}`);
        }, 800);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        setErrorMessage(
          err.response?.data?.detail ??
            "Failed to accept invitation. Please try again.",
        );
        setActiveActionId(null);
      },
    },
  });

  const declineMutation = useDeclineMyInvitation({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        setActiveActionId(null);
        await queryClient.invalidateQueries({
          queryKey: getListMyInvitationsQueryKey(),
        });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        setErrorMessage(
          err.response?.data?.detail ??
            "Failed to decline invitation. Please try again.",
        );
        setActiveActionId(null);
      },
    },
  });

  const handleAccept = (invitationId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveActionId(invitationId);
    acceptMutation.mutate({ invitationId });
  };

  const handleDecline = (invitationId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveActionId(invitationId);
    declineMutation.mutate({ invitationId });
  };

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
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-[.96] tracking-[-.055em] text-ink">
            Pending Invitations
          </h1>
          {invitations.length > 0 && (
            <span className="grid size-7 place-items-center rounded-full bg-accent text-[12px] font-extrabold text-ink shadow-sm">
              {invitations.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Review and respond to invitations to collaborate in organizations on
          Feed.io.
        </p>
      </section>

      {/* Status Messages */}
      {errorMessage && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main List Area */}
      {invitationsQuery.isPending ? (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-12 text-center shadow-sm">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-line border-t-ink" />
          <p className="mt-4 text-sm text-muted">
            Checking for pending invitations...
          </p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="mt-10">
          <TableEmptyState
            icon={Inbox}
            title="No pending invitations"
            description="You don't have any pending invitations right now. When a team invites you to collaborate, you'll be able to accept it directly from here."
          />
        </div>
      ) : (
        <section className="mt-8 space-y-4" aria-label="Invitations list">
          {invitations.map((invitation) => {
            const isProcessing =
              activeActionId === invitation.id &&
              (acceptMutation.isPending || declineMutation.isPending);

            return (
              <article
                key={invitation.id}
                className="group relative flex flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:border-[#141512]/30 hover:shadow-md md:flex-row md:items-center"
              >
                {/* Org & Inviter Information */}
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-[#fafbf7] text-[18px] font-extrabold uppercase text-ink shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    {invitation.organization_name[0] || "O"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-[18px] font-bold tracking-tight text-ink">
                        {invitation.organization_name}
                      </h2>
                      {getRoleBadge(invitation.role)}
                    </div>
                    {invitation.invited_by_name && (
                      <p className="mt-1 text-[13px] text-muted">
                        Invited by{" "}
                        <span className="font-semibold text-ink">
                          {invitation.invited_by_name}
                        </span>
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        Received: {formatDate(invitation.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Clock className="size-3.5" />
                        Expires: {formatDate(invitation.expires_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDecline(invitation.id)}
                    disabled={isProcessing}
                    className="border-line bg-transparent hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="size-4" />
                    Decline
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleAccept(invitation.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing && activeActionId === invitation.id ? (
                      "Joining..."
                    ) : (
                      <>
                        Accept & Join
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
