"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAcceptInvitation,
  useGetCurrentUser,
  useGetInvitationDetails,
} from "@feedio/api-client";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LogIn,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";

import { Button } from "@/modules/ui";

interface InvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function InvitationAcceptPage({ params }: InvitationPageProps) {
  const { token } = use(params);
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUserQuery = useGetCurrentUser({
    query: { retry: false },
  });
  const currentUser = currentUserQuery.data;
  const isAuthenticated = !!currentUser;

  const invitationQuery = useGetInvitationDetails(token, {
    query: { retry: false },
  });

  const acceptMutation = useAcceptInvitation({
    mutation: {
      onSuccess: (data) => {
        router.push(`/app/organizations/${data.slug}`);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err.response?.data?.detail;
        setActionError(detail ?? "Failed to accept invitation. Please try again.");
      },
    },
  });

  const handleAccept = () => {
    setActionError(null);
    acceptMutation.mutate({ token });
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

  if (invitationQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-[480px] rounded-[14px] border border-line bg-surface p-8 text-center shadow-lg">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-[#e3e5db] border-t-ink" />
          <p className="mt-4 text-[14px] text-muted">Loading invitation details...</p>
        </div>
      </main>
    );
  }

  if (invitationQuery.isError || !invitationQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-[480px] rounded-[14px] border border-red-200 bg-surface p-8 text-center shadow-lg">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-[24px] font-bold tracking-tight text-ink">
            Invitation Not Found
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            This invitation link is invalid or may have been removed. Please check the link or ask your team for a new invite.
          </p>
          <div className="mt-6">
            <Button variant="outline" href="/">
              Go to Feed.io Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const details = invitationQuery.data;
  const isEmailMismatch =
    isAuthenticated &&
    currentUser?.email.toLowerCase() !== details.email.toLowerCase();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[500px] rounded-[16px] border border-line bg-surface p-8 shadow-[0_20px_50px_rgba(20,21,18,0.06)] md:p-10">
        {/* Header Badge */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-[6px_2px_6px_2px] bg-accent font-black text-ink">
            F
          </div>
          <span className="text-[16px] font-extrabold tracking-tight text-ink">
            feed.io
          </span>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
            You are invited to collaborate
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-ink">
            Join {details.organization_name}
          </h1>
        </div>

        {/* Invitation Metadata Card - Privacy sanitized */}
        <div className="mt-6 rounded-xl border border-line bg-[#fafbf7] p-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Assigned Role:</span>
            <span>{getRoleBadge(details.role)}</span>
          </div>
        </div>

        {/* Errors / Warnings */}
        {details.is_expired && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <span>This invitation has expired. Please request a new invite from the organization admin.</span>
          </div>
        )}

        {details.is_revoked && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>This invitation has been revoked by the organization administrator.</span>
          </div>
        )}

        {details.is_accepted && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-[13px] text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>This invitation has already been accepted. You can access the organization from your dashboard.</span>
          </div>
        )}

        {isEmailMismatch && !details.is_expired && !details.is_revoked && !details.is_accepted && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Account mismatch</p>
              <p className="mt-0.5 text-[13px]">
                You are currently signed in with an account that does not match this invitation. Please sign in with the invited account to accept.
              </p>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Action Button Area */}
        <div className="mt-8">
          {!details.is_expired && !details.is_revoked && !details.is_accepted ? (
            isAuthenticated ? (
              isEmailMismatch ? (
                <div className="space-y-3">
                  <Button
                    href={`/login?redirect=/invitations/${token}`}
                    fullWidth
                    className="py-3 text-[15px]"
                  >
                    <LogIn className="size-4" />
                    Sign in with another account
                  </Button>
                  <p className="text-center text-[12px] text-muted">
                    Or{" "}
                    <Link
                      href={`/register?redirect=/invitations/${token}`}
                      className="font-bold text-ink underline underline-offset-2"
                    >
                      create an account
                    </Link>{" "}
                    using the invited email.
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  fullWidth
                  className="py-3 text-[15px]"
                >
                  {acceptMutation.isPending ? (
                    "Joining organization..."
                  ) : (
                    <>
                      Accept & Join Organization
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              )
            ) : (
              <div className="space-y-3">
                <Button
                  href={`/login?redirect=/invitations/${token}`}
                  fullWidth
                  className="py-3 text-[15px]"
                >
                  <LogIn className="size-4" />
                  Sign in to Accept
                </Button>
                <p className="text-center text-[12px] text-muted">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/register?redirect=/invitations/${token}`}
                    className="font-bold text-ink underline underline-offset-2"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            )
          ) : (
            <Button variant="outline" href="/app" fullWidth>
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
