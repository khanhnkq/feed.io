"use client";

import type { ProjectIssueResponse } from "@feedio/api-client";
import {
  useGetProject,
  useGetProjectIssuesSummary,
  useListMedia,
  useListProjectIssues,
  useUpdateComment,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  IssuesFilterBar,
  type IssueSortOption,
  type IssueStatusFilter,
} from "./issues_filter_bar";
import { IssuesMetricsCards } from "./issues_metrics_cards";
import { IssuesTableView } from "./issues_table_view";

interface ProjectIssuesScreenProps {
  organizationId: string;
  organizationSlug: string;
  projectId: string;
}

export function ProjectIssuesScreen({
  organizationId,
  organizationSlug,
  projectId,
}: ProjectIssuesScreenProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("open");
  const [sortOption, setSortOption] = useState<IssueSortOption>("newest");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  // 1. Fetch Project Details
  const projectQuery = useGetProject(organizationId, projectId, {
    query: { enabled: Boolean(projectId) },
  });
  const project = projectQuery.data;

  // 2. Fetch Project Summary Metrics
  const summaryQuery = useGetProjectIssuesSummary(
    organizationId,
    projectId,
    undefined,
    {
      query: { enabled: Boolean(projectId) },
    },
  );
  const summary = summaryQuery.data || { total: 0, open: 0, resolved: 0 };

  // 3. Fetch Media List for filter dropdown
  const mediaQuery = useListMedia(
    organizationId,
    projectId,
    { include_subfolders: true },
    {
      query: { enabled: Boolean(projectId) },
    },
  );
  const mediaOptions = useMemo(() => {
    const items = mediaQuery.data?.items || [];
    return items.map((m) => ({ id: m.id, title: m.title }));
  }, [mediaQuery.data?.items]);

  // 4. Fetch Issues List
  const issuesQuery = useListProjectIssues(
    organizationId,
    projectId,
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      media_id: selectedMediaId || undefined,
      search: search.trim() || undefined,
      limit: 100,
    },
    {
      query: {
        enabled: Boolean(projectId),
      },
    },
  );
  const issues = useMemo(
    () => issuesQuery.data?.items || [],
    [issuesQuery.data?.items],
  );

  const sortedIssues = useMemo(() => {
    const list = [...issues];
    if (sortOption === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortOption === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } else if (sortOption === "timecode") {
      list.sort(
        (a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0),
      );
    }
    return list;
  }, [issues, sortOption]);

  // 5. Toggle Status Mutation
  const updateCommentMutation = useUpdateComment({
    mutation: {
      onSettled: () => {
        setUpdatingIssueId(null);
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.some(
              (k) =>
                typeof k === "string" &&
                (k.includes("issues") || k.includes("comments")),
            ),
        });
      },
    },
  });

  const handleToggleStatus = (issue: ProjectIssueResponse) => {
    const nextStatus = issue.status === "open" ? "resolved" : "open";
    setUpdatingIssueId(issue.id);
    updateCommentMutation.mutate({
      organizationId,
      projectId,
      mediaId: issue.media_id,
      commentId: issue.id,
      data: {
        status: nextStatus,
      },
    });
  };

  if (projectQuery.isPending) {
    return (
      <main className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
        <div className="grid min-h-60 place-items-center text-sm text-muted">
          Loading issues...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
        <section className="mt-8 rounded-xl border border-dashed border-line bg-surface p-12 text-center text-muted">
          <span className="font-mono text-5xl font-bold tracking-tight text-muted/40">
            404
          </span>
          <h2 className="my-3 text-xl font-bold text-ink">Project not found</h2>
          <p className="m-0 text-sm">
            The project you are looking for does not exist or you do not have permission to access it.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header Section */}
      <section className="flex flex-col items-start gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em] text-ink">
              Issues
            </h1>
          </div>
          <p className="mt-[18px] text-[15px] text-muted">
            Track review feedback, open action items, and resolved changes across all media in this project.
          </p>
        </div>
      </section>

      {/* Metrics Summary Cards */}
      <section className="mt-8">
        <IssuesMetricsCards
          total={summary.total}
          openCount={summary.open}
          resolvedCount={summary.resolved}
        />
      </section>

      {/* Filter & View Bar */}
      <section className="mt-8 mb-4">
        <IssuesFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          mediaList={mediaOptions}
          selectedMediaId={selectedMediaId}
          onMediaSelect={setSelectedMediaId}
          count={sortedIssues.length}
          totalCount={summary.total}
          openCount={summary.open}
          resolvedCount={summary.resolved}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />
      </section>

      {/* Issues Table List */}
      <section className="mt-4">
        <IssuesTableView
          issues={sortedIssues}
          orgSlug={organizationSlug}
          projectId={projectId}
          onToggleStatus={handleToggleStatus}
          isUpdatingStatusId={updatingIssueId}
          isLoading={issuesQuery.isPending}
        />
      </section>
    </main>
  );
}
