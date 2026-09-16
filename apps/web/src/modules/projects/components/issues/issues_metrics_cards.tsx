"use client";

import { AlertCircle, CheckCircle2, ListTodo, TrendingUp } from "lucide-react";
import React from "react";
import { Badge, Card, ProgressBar } from "@/modules/ui";

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Issues */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Total Issues
          </span>
          <div className="grid size-7 place-items-center rounded-lg border border-line bg-surface text-ink">
            <ListTodo size={14} />
          </div>
        </div>
        <div className="mt-3">
          <span className="font-mono text-3xl font-black text-ink">{total}</span>
          <p className="text-[11px] text-muted mt-1">Across all media assets</p>
        </div>
      </Card>

      {/* 2. Open Issues */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Open
          </span>
          <div className="grid size-7 place-items-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700">
            <AlertCircle size={14} />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-amber-700">
              {openCount}
            </span>
            {total > 0 && (
              <Badge variant="surface" size="sm" className="font-bold">
                {Math.round((openCount / total) * 100)}%
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted mt-1">Action items requiring review</p>
        </div>
      </Card>

      {/* 3. Resolved Issues */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Resolved
          </span>
          <div className="grid size-7 place-items-center rounded-lg border border-lime bg-lime/20 text-ink">
            <CheckCircle2 size={14} />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-ink">
              {resolvedCount}
            </span>
            {total > 0 && (
              <Badge variant="success" size="sm" dot className="font-bold">
                Done
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted mt-1">Feedback verified & fixed</p>
        </div>
      </Card>

      {/* 4. Resolution Rate */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Resolution Rate
          </span>
          <div className="grid size-7 place-items-center rounded-lg border border-line bg-surface text-ink">
            <TrendingUp size={14} />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-black text-ink">
              {resolutionPct}%
            </span>
            <span className="font-mono text-[11px] text-muted">
              {resolvedCount}/{total}
            </span>
          </div>
          <ProgressBar value={resolutionPct} variant="lime" size="sm" />
        </div>
      </Card>
    </div>
  );
}
