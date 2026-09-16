"use client";

import type { ProjectIssueResponse } from "@feedio/api-client";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Film,
  ImageIcon,
  MessageSquare,
  PenTool,
  RotateCcw,
} from "lucide-react";
import React from "react";
import {
  Avatar,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@/modules/ui";

interface IssuesTableViewProps {
  issues: ProjectIssueResponse[];
  orgSlug: string;
  projectId: string;
  onToggleStatus: (issue: ProjectIssueResponse) => void;
  isUpdatingStatusId?: string | null;
  isLoading?: boolean;
}

function formatTimecodeSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "00:00";
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(mins)}:${pad(secs)}`;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSecs < 60) return "just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function IssuesTableView({
  issues,
  orgSlug,
  projectId,
  onToggleStatus,
  isUpdatingStatusId,
  isLoading = false,
}: IssuesTableViewProps) {
  if (isLoading) {
    return (
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%] min-w-[200px]">
                Feedback / Note
              </TableHead>
              <TableHead className="hidden sm:table-cell w-[22%] min-w-[140px]">
                Media Asset
              </TableHead>
              <TableHead className="hidden md:table-cell w-28 whitespace-nowrap">
                Timestamp
              </TableHead>
              <TableHead className="hidden md:table-cell w-36 whitespace-nowrap">
                Created By
              </TableHead>
              <TableHead className="hidden lg:table-cell w-24">
                Status
              </TableHead>
              <TableHead align="right" className="w-48 whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableSkeleton columnsCount={6} rowsCount={4} />
        </Table>
      </TableContainer>
    );
  }

  if (issues.length === 0) {
    return (
      <TableContainer>
        <Table>
          <TableBody>
            <TableEmptyState
              icon={CheckCircle2}
              title="No issues found"
              description="No feedback comments match your current filter criteria."
              variant="embedded"
              colSpan={6}
            />
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%] min-w-[200px]">
              Feedback / Note
            </TableHead>
            <TableHead className="hidden sm:table-cell w-[22%] min-w-[140px]">
              Media Asset
            </TableHead>
            <TableHead className="hidden md:table-cell w-28 whitespace-nowrap">
              Timestamp
            </TableHead>
            <TableHead className="hidden md:table-cell w-36 whitespace-nowrap">
              Created By
            </TableHead>
            <TableHead className="hidden lg:table-cell w-24">Status</TableHead>
            <TableHead align="right" className="w-48 whitespace-nowrap">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <IssueTableRow
              key={issue.id}
              issue={issue}
              orgSlug={orgSlug}
              projectId={projectId}
              onToggleStatus={onToggleStatus}
              isUpdating={isUpdatingStatusId === issue.id}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function IssueTableRow({
  issue,
  orgSlug,
  projectId,
  onToggleStatus,
  isUpdating,
}: {
  issue: ProjectIssueResponse;
  orgSlug: string;
  projectId: string;
  onToggleStatus: (issue: ProjectIssueResponse) => void;
  isUpdating: boolean;
}) {
  const isResolved = issue.status === "resolved";
  const hasAnnotation = Boolean(
    issue.annotation_data &&
    (Array.isArray(issue.annotation_data)
      ? issue.annotation_data.length > 0
      : Object.keys(issue.annotation_data).length > 0),
  );

  const authorName = issue.author?.name || "Member";
  const authorAvatarUrl = issue.author?.avatar_url || null;

  const reviewUrl = `/app/organizations/${orgSlug}/projects/${projectId}/media/${issue.media_id}?commentId=${issue.id}${
    issue.timestamp_seconds !== null && issue.timestamp_seconds !== undefined
      ? `&t=${issue.timestamp_seconds}`
      : ""
  }`;

  return (
    <TableRow className={isResolved ? "opacity-75" : ""}>
      {/* 1. Feedback Note */}
      <TableCell className="py-4">
        <div className="flex flex-col gap-1.5">
          <p
            className={`text-sm leading-snug break-words ${
              isResolved ? "text-muted line-through" : "font-semibold text-ink"
            }`}
          >
            {issue.content}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{formatRelativeTime(issue.created_at)}</span>

            {hasAnnotation && (
              <span className="inline-flex items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-[10px] font-medium text-muted border border-line">
                <PenTool size={10} />
                <span>Markup</span>
              </span>
            )}

            {(issue.replies_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted">
                <MessageSquare size={10} />
                <span>{issue.replies_count}</span>
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* 2. Media Asset */}
      <TableCell className="hidden sm:table-cell py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-paper text-muted overflow-hidden">
            {issue.media_thumbnail_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={issue.media_thumbnail_url}
                alt={issue.media_title}
                className="size-full rounded-lg object-cover"
              />
            ) : issue.media_type === "image" ? (
              <ImageIcon size={14} />
            ) : (
              <Film size={14} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink max-w-[130px] md:max-w-[170px]">
              {issue.media_title}
            </p>
            {issue.media_version_number !== null &&
              issue.media_version_number !== undefined && (
                <span className="inline-block text-[10px] font-mono font-semibold text-muted">
                  v{issue.media_version_number}
                </span>
              )}
          </div>
        </div>
      </TableCell>

      {/* 3. Timestamp / Frame */}
      <TableCell className="hidden md:table-cell w-28 whitespace-nowrap py-4">
        {issue.timestamp_seconds !== null &&
        issue.timestamp_seconds !== undefined ? (
          <div className="flex items-center gap-1.5 font-mono text-xs text-ink font-semibold">
            <span className="rounded bg-paper border border-line px-1.5 py-0.5">
              {formatTimecodeSeconds(issue.timestamp_seconds)}
            </span>
            {issue.frame_number !== null &&
              issue.frame_number !== undefined && (
                <span className="text-[10px] text-muted font-normal">
                  f.{issue.frame_number}
                </span>
              )}
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </TableCell>

      {/* 4. Created By */}
      <TableCell className="hidden md:table-cell w-36 whitespace-nowrap py-4">
        <div className="flex items-center gap-2">
          <Avatar name={authorName} src={authorAvatarUrl} size="xs" />
          <span className="text-xs font-medium text-ink truncate max-w-[130px]">
            {authorName}
          </span>
        </div>
      </TableCell>

      {/* 5. Status Badge */}
      <TableCell className="hidden lg:table-cell w-24 py-4">
        <Badge
          variant={isResolved ? "success" : "surface"}
          size="sm"
          dot
          className="font-bold"
        >
          {isResolved ? "Resolved" : "Open"}
        </Badge>
      </TableCell>

      {/* 6. Actions: Mark as Resolved / Reopen + Review Deep-link */}
      <TableCell align="right" className="w-48 whitespace-nowrap py-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant={isResolved ? "ghost" : "outline"}
            size="sm"
            onClick={() => onToggleStatus(issue)}
            disabled={isUpdating}
            className="gap-1 text-xs"
            aria-label={isResolved ? "Reopen issue" : "Mark as resolved"}
          >
            {isResolved ? (
              <>
                <RotateCcw size={12} />
                <span>Reopen</span>
              </>
            ) : (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>Resolve</span>
              </>
            )}
          </Button>

          <Button
            href={reviewUrl}
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
          >
            <span>Review</span>
            <ExternalLink size={12} className="text-ink" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
