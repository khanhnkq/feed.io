"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import type { AdminPlatformRole, AdminUser } from "../types";

export interface ChangeRoleDialogProps {
  user: AdminUser | null;
  targetRole: AdminPlatformRole;
  onTargetRoleChange: (role: AdminPlatformRole) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  {
    role: "user" as const,
    title: "Standard User",
    desc: "Default access. Restricted to their assigned organizations and projects.",
  },
  {
    role: "support" as const,
    title: "Support Specialist",
    desc: "Can view system metrics, inspect organizations, and troubleshoot user accounts.",
  },
  {
    role: "super_admin" as const,
    title: "Super Administrator",
    desc: "Full unrestricted platform control, including rate limit adjustments and quota overrides.",
  },
];

export function ChangeRoleDialog({
  user,
  targetRole,
  onTargetRoleChange,
  onConfirm,
  onClose,
}: ChangeRoleDialogProps) {
  if (!user) return null;

  return (
    <Dialog
      isOpen={Boolean(user)}
      onClose={onClose}
      size="md"
      ariaLabelledBy="role-dialog-title"
    >
      <DialogCloseButton onClick={onClose} />
      <DialogHeader>
        <DialogEyebrow>Access Control</DialogEyebrow>
        <DialogTitle id="role-dialog-title">Change Platform Role</DialogTitle>
        <DialogDescription>
          Modify platform-level administrative privileges for{" "}
          <strong>{user.display_name}</strong> ({user.email}).
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-ink block">
            Assign Platform Role
          </label>
          <div className="space-y-2">
            {ROLE_OPTIONS.map((item) => (
              <label
                key={item.role}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  targetRole === item.role
                    ? "border-ink bg-paper shadow-sm"
                    : "border-line bg-surface hover:bg-paper/50"
                }`}
              >
                <input
                  type="radio"
                  name="platform_role"
                  value={item.role}
                  checked={targetRole === item.role}
                  onChange={() => onTargetRoleChange(item.role)}
                  className="mt-1 accent-ink"
                />
                <div className="text-xs">
                  <strong className="block text-ink font-bold">
                    {item.title}
                  </strong>
                  <span className="text-muted leading-relaxed">
                    {item.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {targetRole === "super_admin" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-[#fff7d6] p-3 text-xs text-ink">
            <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
            <span>
              <strong>Warning:</strong> Super Administrators hold complete
              governance over all organizations and security policies.
            </span>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onConfirm}>
          Save Changes
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
