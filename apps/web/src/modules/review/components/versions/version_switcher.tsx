"use client";

import type { MediaResponse } from "@feedio/api-client";
import { Check, ChevronDown, History, Layers } from "lucide-react";
import React, { useState } from "react";

interface VersionSwitcherProps {
  currentMedia: MediaResponse;
  versions: MediaResponse[];
  onSelectVersion: (mediaId: string) => void;
}

export function VersionSwitcher({
  currentMedia,
  versions,
  onSelectVersion,
}: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentVersionNumber = currentMedia.version_number || 1;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink shadow-xs transition hover:border-ink hover:bg-surface"
      >
        <div className="grid size-5 place-items-center rounded bg-lime border border-ink/20 text-ink shadow-2xs">
          <Layers size={12} strokeWidth={2.2} />
        </div>
        <span className="font-mono font-bold text-ink">V{currentVersionNumber}</span>
        <ChevronDown size={13} className="text-muted" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-2 z-50 w-56 origin-top-left rounded-xl border border-line bg-paper p-1 shadow-xl">
            <div className="px-3 py-2 border-b border-line/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Version History
              </p>
            </div>

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
                          <span className="truncate max-w-[120px]">{ver.title}</span>
                        </div>
                        <span className="text-[10px] text-muted mt-0.5 ml-7">
                          {new Date(ver.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {isSelected && <Check size={14} className="text-ink ml-2" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-line/60 p-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted">
                <History size={12} />
                <span>Auto-stacked versions</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
