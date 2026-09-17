"use client";

import type { MediaResponse } from "@feedio/api-client";
import { Check, ChevronDown, Plus } from "lucide-react";
import React, { useState } from "react";

interface VersionSwitcherProps {
  currentMedia: MediaResponse;
  versions: MediaResponse[];
  onSelectVersion: (mediaId: string) => void;
  onUploadVersion?: () => void;
}

export function VersionSwitcher({
  currentMedia,
  versions,
  onSelectVersion,
  onUploadVersion,
}: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentVersionNumber = currentMedia.version_number || 1;

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex min-h-9 h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 font-mono text-xs font-bold text-ink shadow-xs transition duration-150 hover:border-ink hover:bg-surface focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-1"
      >
        <span className="font-mono font-bold text-ink">
          V{currentVersionNumber}
        </span>
        <ChevronDown
          size={12}
          className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-2 z-50 w-60 origin-top-left rounded-xl border border-line bg-paper p-1 shadow-xl">
            <div className="py-1 max-h-60 overflow-y-auto">
              {versions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">
                  Current: V{currentVersionNumber}
                </div>
              ) : (
                versions.map((ver) => {
                  const isSelected = ver.id === currentMedia.id;
                  const vNum = ver.version_number || 1;
                  return (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => {
                        onSelectVersion(ver.id);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition ${
                        isSelected
                          ? "bg-surface border border-line font-bold text-ink"
                          : "text-ink hover:bg-surface/50 border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div
                            className={`grid size-5 place-items-center rounded border text-[10px] font-mono font-bold ${
                              isSelected
                                ? "bg-lime border-ink/20 text-ink"
                                : "bg-paper border-line text-muted"
                            }`}
                          >
                            V{vNum}
                          </div>
                          <span className="truncate max-w-[120px]">
                            {ver.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted mt-0.5 ml-7">
                          {new Date(ver.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {isSelected && (
                        <Check size={14} className="text-ink ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-line/60 p-1 space-y-1">
              {onUploadVersion && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onUploadVersion();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink bg-lime/20 border border-lime/50 hover:bg-lime transition shadow-2xs cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Upload New Version</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
