"use client";

import type { ProjectResponse } from "@feedio/api-client";
import {
  getListProjectMembersQueryKey,
  useAddProjectMember,
  useListOrganizationMembers,
  useListProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Shield, Trash2, UserPlus, Users } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

interface ProjectMembersDialogProps {
  project: ProjectResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectMembersDialog({
  project,
  isOpen,
  onClose,
}: ProjectMembersDialogProps) {
  if (!project) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="project-members-dialog-title"
      ariaDescribedBy="project-members-dialog-description"
      size="lg"
    >
      <DialogCloseButton onClick={onClose} />
      <ProjectMembersContent project={project} onClose={onClose} />
    </Dialog>
  );
}

function ProjectMembersContent({
  project,
}: {
  project: ProjectResponse;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"editor" | "viewer">(
    "editor",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: projectMembersData, isLoading: isLoadingMembers } =
    useListProjectMembers(organization.id, project.id, undefined, {
      query: {
        enabled: Boolean(project.id && organization.id),
      },
    });
  const projectMembers = useMemo(
    () => projectMembersData?.items ?? [],
    [projectMembersData?.items],
  );

  const { data: orgMembersData } = useListOrganizationMembers(
    organization.id,
    undefined,
    {
      query: {
        enabled: Boolean(organization.id),
      },
    },
  );
  const orgMembers = useMemo(
    () => orgMembersData?.items ?? [],
    [orgMembersData?.items],
  );

  // Filter org members who are not yet added to this project
  const availableOrgMembers = useMemo(() => {
    const existingIds = new Set(projectMembers.map((m) => m.user_id));
    return orgMembers.filter((m) => !existingIds.has(m.user_id));
  }, [orgMembers, projectMembers]);

  // Mutations
  const invalidateMembers = () => {
    queryClient.invalidateQueries({
      queryKey: getListProjectMembersQueryKey(organization.id, project.id),
    });
  };

  const addMemberMutation = useAddProjectMember({
    mutation: {
      onSuccess: () => {
        setSelectedUserId("");
        setErrorMessage(null);
        invalidateMembers();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ??
          (err as Error).message ??
          "Could not add member to project.";
        setErrorMessage(msg);
      },
    },
  });

  const updateRoleMutation = useUpdateProjectMemberRole({
    mutation: {
      onSuccess: () => {
        setErrorMessage(null);
        invalidateMembers();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ??
          (err as Error).message ??
          "Could not update member role.";
        setErrorMessage(msg);
      },
    },
  });

  const removeMemberMutation = useRemoveProjectMember({
    mutation: {
      onSuccess: () => {
        setErrorMessage(null);
        invalidateMembers();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ??
          (err as Error).message ??
          "Could not remove member from project.";
        setErrorMessage(msg);
      },
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setErrorMessage(null);
    addMemberMutation.mutate({
      organizationId: organization.id,
      projectId: project.id,
      data: {
        user_id: selectedUserId,
        project_role: selectedRole,
      },
    });
  };

  const handleRoleChange = (userId: string, newRole: "editor" | "viewer") => {
    updateRoleMutation.mutate({
      organizationId: organization.id,
      projectId: project.id,
      userId,
      data: {
        project_role: newRole,
      },
    });
  };

  const handleRemove = (userId: string) => {
    removeMemberMutation.mutate({
      organizationId: organization.id,
      projectId: project.id,
      userId,
    });
  };

  const isPrivate = project.visibility === "private";

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogEyebrow>Access & Permissions</DialogEyebrow>
        <DialogTitle id="project-members-dialog-title">
          Project Members - {project.name}
        </DialogTitle>
        <DialogDescription id="project-members-dialog-description">
          Manage who can access and collaborate on this project.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        {/* Project Privacy Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-ink bg-surface p-4 shadow-[2px_2px_0px_#11130f]">
          <div className="grid size-7 shrink-0 place-items-center rounded-md border border-ink bg-lime text-ink">
            {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-ink">
              {isPrivate ? "Private Project" : "Public Project"}
            </p>
            <p className="mt-0.5 text-muted">
              {isPrivate
                ? "Only assigned collaborators below and organization admins have access."
                : "All members in your organization can view and collaborate. To restrict access, switch to Private in Project Settings."}
            </p>
          </div>
        </div>

        {/* Add Member Form */}
        <form
          onSubmit={handleAddMember}
          className="flex flex-col gap-2 rounded-xl border border-line bg-surface/50 p-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none transition focus:border-ink"
              disabled={availableOrgMembers.length === 0}
            >
              <option value="">
                {availableOrgMembers.length === 0
                  ? "All organization members already added"
                  : "Select member to assign..."}
              </option>
              {availableOrgMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <select
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as "editor" | "viewer")
              }
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none transition focus:border-ink"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={
              !selectedUserId ||
              addMemberMutation.isPending ||
              availableOrgMembers.length === 0
            }
            pending={addMemberMutation.isPending}
          >
            <UserPlus size={14} />
            Assign
          </Button>
        </form>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              Assigned Collaborators ({projectMembers.length})
            </span>
          </div>

          {isLoadingMembers ? (
            <div className="py-6 text-center text-xs text-muted">
              Loading members...
            </div>
          ) : projectMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center">
              <Shield className="mx-auto mb-2 h-6 w-6 text-muted" />
              <p className="text-xs font-bold text-ink">
                No assigned collaborators yet
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {isPrivate
                  ? "Only organization admins currently have access to this private project."
                  : "All organization members currently have open access."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-xl border border-line bg-surface">
              {projectMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 p-3 transition hover:bg-black/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-lime font-bold text-xs text-ink shadow-[1px_1px_0px_#11130f]">
                      {m.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">
                        {m.display_name}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {m.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.project_role}
                      onChange={(e) =>
                        handleRoleChange(
                          m.user_id,
                          e.target.value as "editor" | "viewer",
                        )
                      }
                      disabled={
                        updateRoleMutation.isPending ||
                        removeMemberMutation.isPending
                      }
                      className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink outline-none transition focus:border-ink"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemove(m.user_id)}
                      disabled={removeMemberMutation.isPending}
                      title="Remove from project"
                      className="rounded-lg p-1.5 text-muted transition hover:border hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogBody>
    </div>
  );
}
