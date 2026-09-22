"use client";

import React from "react";
import {
  Button,
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import type { AdminUser } from "../types";

export interface SuspendUserDialogProps {
  user: AdminUser | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function SuspendUserDialog({
  user,
  onConfirm,
  onClose,
}: SuspendUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog
      isOpen={Boolean(user)}
      onClose={onClose}
      size="sm"
      ariaLabelledBy="status-dialog-title"
    >
      <DialogCloseButton onClick={onClose} />
      <DialogHeader>
        <DialogEyebrow>Account Governance</DialogEyebrow>
        <DialogTitle id="status-dialog-title">
          {user.status === "active"
            ? "Suspend User Account"
            : "Reactivate User Account"}
        </DialogTitle>
        <DialogDescription>
          {user.status === "active" ? (
            <>
              Are you sure you want to suspend{" "}
              <strong>{user.display_name}</strong>? This will immediately
              invalidate their active sessions and prevent sign-in.
            </>
          ) : (
            <>
              Restore sign-in privileges and project collaboration access for{" "}
              <strong>{user.display_name}</strong>?
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="mt-6">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={user.status === "active" ? "danger" : "primary"}
          size="sm"
          onClick={onConfirm}
        >
          {user.status === "active" ? "Suspend Account" : "Reactivate"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
