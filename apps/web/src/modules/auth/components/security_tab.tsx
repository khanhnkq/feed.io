"use client";

import React from "react";
import { ChangePasswordForm } from "./change_password_form";
import { SessionsManager } from "./sessions_manager";

export function SecurityTab() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h3 className="text-base font-bold text-ink">Account Security</h3>
        <p className="text-xs text-muted mt-0.5">
          Manage your account credentials, password, and active login sessions.
        </p>
      </div>

      <ChangePasswordForm />

      <SessionsManager />
    </div>
  );
}
