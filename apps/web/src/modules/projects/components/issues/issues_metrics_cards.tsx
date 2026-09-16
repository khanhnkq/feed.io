"use client";

import { AlertCircle, CheckCircle2, ListTodo, TrendingUp } from "lucide-react";
import React from "react";
import { Card, ProgressBar } from "@/modules/ui";

interface IssuesMetricsCardsProps {
  total: number;
  openCount: number;
  resolvedCount: number;
}

export function IssuesMetricsCards({
  total,
  openCount,
  resolvedCount,
}: IssuesMetricsCardsProps) {
  const resolutionPct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const openPct = total > 0 ? Math.round((openCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Issues */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Total Issues
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <ListTodo size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{total}</span>
          <p className="text-[11px] text-muted mt-1">Across all media assets</p>
        </div>
      </Card>

      {/* 2. Open Issues */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Open
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <AlertCircle size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{openCount}</span>
          <p className="text-[11px] text-muted mt-1">
            {total > 0 ? `${openPct}% of total issues` : "Pending review & action"}
          </p>
        </div>
      </Card>

      {/* 3. Resolved Issues */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Resolved
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <CheckCircle2 size={15} />
          </div>
        </div>
        <div className="mt-4">
          <span className="font-mono text-3xl font-black text-ink">{resolvedCount}</span>
          <p className="text-[11px] text-muted mt-1">
            {total > 0 ? `${resolutionPct}% resolved so far` : "Feedback verified & closed"}
          </p>
        </div>
      </Card>

      {/* 4. Resolution Rate */}
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Resolution Rate
          </span>
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-black text-ink">
              {resolutionPct}%
            </span>
            <span className="font-mono text-[11px] text-muted">
              {resolvedCount} of {total}
            </span>
          </div>
          <ProgressBar value={resolutionPct} variant="ink" size="sm" />
        </div>
      </Card>
    </div>
  );
}
