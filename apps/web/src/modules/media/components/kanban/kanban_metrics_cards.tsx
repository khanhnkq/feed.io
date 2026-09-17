"use client";

import { AlertCircle, CircleDashed, Clock, TrendingUp } from "lucide-react";
import React from "react";
import { Card, ProgressBar } from "../../../ui";

export interface KanbanMetricsCardsProps {
  total: number;
  pendingCount: number;
  inProgressCount: number;
  needsChangesCount: number;
  approvedCount: number;
}

export function KanbanMetricsCards({
  total,
  pendingCount,
  inProgressCount,
  needsChangesCount,
  approvedCount,
}: KanbanMetricsCardsProps) {
  const approvedPct = total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pendingCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgressCount / total) * 100) : 0;
  const needsChangesPct = total > 0 ? Math.round((needsChangesCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Pending Review */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Pending Review
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <CircleDashed size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{pendingCount}</span>
          <p className="text-[11px] text-muted mt-1">
            {total > 0 ? `${pendingPct}% awaiting review` : "No pending assets"}
          </p>
        </div>
      </Card>

      {/* 2. In Progress */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            In Progress
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <Clock size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{inProgressCount}</span>
          <p className="text-[11px] text-muted mt-1">
            {total > 0 ? `${inProgressPct}% in active revisions` : "No active edits"}
          </p>
        </div>
      </Card>

      {/* 3. Needs Changes */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Needs Changes
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <AlertCircle size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{needsChangesCount}</span>
          <p className="text-[11px] text-muted mt-1">
            {total > 0 ? `${needsChangesPct}% revisions requested` : "No revision requests"}
          </p>
        </div>
      </Card>

      {/* 4. Approval Rate */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Approval Rate
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-black text-ink">
              {approvedPct}%
            </span>
            <span className="font-mono text-[11px] text-muted">
              {approvedCount} of {total}
            </span>
          </div>
          <ProgressBar value={approvedPct} variant="ink" size="sm" />
        </div>
      </Card>
    </div>
  );
}
