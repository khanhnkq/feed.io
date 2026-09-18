"use client";

import React from "react";
import { ChangePasswordForm } from "./change_password_form";
import { SessionsManager } from "./sessions_manager";

export function SecurityTab() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <ChangePasswordForm />

      <SessionsManager />
    </div>
  );
}
