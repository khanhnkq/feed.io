"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { useListOrganizations } from "@feedio/api-client";
import { Plus } from "lucide-react";
import React, { useMemo, useState } from "react";

import { Button, FilterToolbar, type ViewMode } from "@/modules/ui";
import {
  ORGANIZATION_SORT_OPTIONS,
  type SortOption,
  filterOrganizations,
  sortOrganizations,
} from "../lib/organization_filter";
import { CreateOrganizationDialog } from "./create_organization_dialog";
import { DeleteOrganizationDialog } from "./delete_organization_dialog";
import { EditOrganizationDialog } from "./edit_organization_dialog";
import { OrganizationCard } from "./organization_card";
import { OrganizationEmptyState } from "./organization_empty_state";
import { OrganizationTableView } from "./organization_table_view";

export function GlobalDashboardScreen() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationResponse | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<OrganizationResponse | null>(null);

  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const organizationsQuery = useListOrganizations(undefined, { query: { retry: false } });
  const rawOrganizations = organizationsQuery.data?.items;

  const filteredAndSortedOrganizations = useMemo(() => {
    const orgs = rawOrganizations ?? [];
    const filtered = filterOrganizations(orgs, search);
    return sortOrganizations(filtered, sortOption);
  }, [rawOrganizations, search, sortOption]);

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)] font-bold leading-[.96] tracking-[-.055em]">
            Your Organizations
          </h1>
          <p className="mt-3 text-sm text-muted">
            Select an organization to manage projects, review video assets and
            collaborate with your team.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
        >
          <Plus size={16} /> New organization
        </Button>
      </section>

      {organizationsQuery.isPending ? (
        <p className="mt-12 animate-pulse text-sm text-muted">
          Loading organizations…
        </p>
      ) : (rawOrganizations?.length ?? 0) === 0 ? (
        <OrganizationEmptyState
          onCreateOrganization={() => setIsCreateOpen(true)}
        />
      ) : (
        <section className="mt-8 space-y-6">
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search organizations by name or slug..."
            count={filteredAndSortedOrganizations.length}
            itemLabelSingular="organization"
            itemLabelPlural="organizations"
            sortOption={sortOption}
            onSortChange={setSortOption}
            sortOptions={ORGANIZATION_SORT_OPTIONS}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            borderTop={false}
          />

          {filteredAndSortedOrganizations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
              <p className="text-sm font-semibold text-ink">No organizations found</p>
              <p className="mt-1 text-xs text-muted">
                No organizations match &ldquo;{search}&rdquo;. Try clearing your search query.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearch("")}
              >
                Clear filter
              </Button>
            </div>
          ) : viewMode === "list" ? (
            <OrganizationTableView
              organizations={filteredAndSortedOrganizations}
              onEdit={setEditingOrg}
              onDelete={setDeletingOrg}
            />
          ) : (
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Organization list"
            >
              {filteredAndSortedOrganizations.map((org, index) => (
                <OrganizationCard
                  key={org.id}
                  organization={org}
                  index={index}
                  onEdit={setEditingOrg}
                  onDelete={setDeletingOrg}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <CreateOrganizationDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditOrganizationDialog
        organization={editingOrg}
        isOpen={Boolean(editingOrg)}
        onClose={() => setEditingOrg(null)}
      />

      <DeleteOrganizationDialog
        organization={deletingOrg}
        isOpen={Boolean(deletingOrg)}
        onClose={() => setDeletingOrg(null)}
      />
    </main>
  );
}
