"use client";

import React from "react";
import { Avatar } from "../../../ui/components/avatar";

export interface MentionUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

export interface MentionDropdownProps {
  users: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  className?: string;
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  className = "",
}: MentionDropdownProps) {
  if (users.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Suggested team members"
      className={`absolute bottom-full left-0 mb-2 w-64 max-h-52 overflow-y-auto bg-surface border border-line rounded-xl p-1 z-30 shadow-lg ${className}`}
    >
      <div className="space-y-0.5">
        {users.map((user, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(user);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition ${
                isSelected
                  ? "bg-paper border border-line text-ink font-medium"
                  : "text-ink hover:bg-paper/70 border border-transparent"
              }`}
            >
              <Avatar
                src={user.avatar_url}
                name={user.name}
                size="xs"
                tone="surface"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-ink truncate leading-tight">
                  {user.name}
                </span>
                {user.email && (
                  <span className="text-[10px] text-muted truncate leading-tight mt-0.5">
                    {user.email}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
