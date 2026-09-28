"use client";

import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import { CheckCircle2, Download, Film, Lock, Sparkles, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge, Button, Dialog } from "../../../ui";
import {
  downloadFile,
  generateDaVinciCSV,
  generateEDL,
  generateFCPXML,
  generatePremiereCSV,
  type MarkerExportItem,
} from "../../lib/nle_marker_export";

export type NleFormat = "premiere" | "resolve_edl" | "resolve_csv" | "fcpxml";

export interface NleExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaResponse;
  comments: CommentResponse[];
  hasNleAccess: boolean;
  onOpenUpgrade: () => void;
}

export function NleExportDialog({
  isOpen,
  onClose,
  media,
  comments,
  hasNleAccess,
  onOpenUpgrade,
}: NleExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<NleFormat>("premiere");
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const fps = media.fps || 24;

  const validMarkers: MarkerExportItem[] = useMemo(() => {
    return comments
      .filter((c) => typeof c.timestamp_seconds === "number" && c.timestamp_seconds >= 0)
      .map((c) => ({
        id: c.id,
        content: c.content,
        timestamp_seconds: c.timestamp_seconds,
        author_name: c.author?.name || "Reviewer",
        status: c.status,
      }));
  }, [comments]);

  const handleExport = () => {
    if (!hasNleAccess) {
      onOpenUpgrade();
      return;
    }

    const cleanTitle = (media.title || "video").replace(/\.[^/.]+$/, "");

    switch (selectedFormat) {
      case "premiere": {
        const content = generatePremiereCSV(validMarkers, fps, cleanTitle);
        downloadFile(content, `${cleanTitle}_premiere_markers.csv`, "text/csv;charset=utf-8;");
        break;
      }
      case "resolve_csv": {
        const content = generateDaVinciCSV(validMarkers, fps);
        downloadFile(content, `${cleanTitle}_resolve_markers.csv`, "text/csv;charset=utf-8;");
        break;
      }
      case "resolve_edl": {
        const content = generateEDL(validMarkers, fps, cleanTitle);
        downloadFile(content, `${cleanTitle}_markers.edl`, "text/plain;charset=utf-8;");
        break;
      }
      case "fcpxml": {
        const content = generateFCPXML(validMarkers, fps, cleanTitle);
        downloadFile(content, `${cleanTitle}_fcpxml_markers.fcpxml`, "application/xml;charset=utf-8;");
        break;
      }
    }

    setCopiedSuccess(true);
    setTimeout(() => {
      setCopiedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col bg-paper text-ink p-6 select-none font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-ink" />
            <h2 className="text-lg font-bold">Export NLE Timeline Markers</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded border border-line bg-paper text-muted hover:text-ink hover:border-ink transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        {!hasNleAccess ? (
          /* Gated State for Free Plan */
          <div className="mt-5 space-y-4 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full border border-line bg-surface text-ink shadow-xs">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-bold text-ink">NLE Marker Export is a Pro Feature</h3>
                <Badge variant="lime">Pro</Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                Export frame-accurate review notes and timestamps directly into Adobe Premiere Pro, DaVinci Resolve, and Final Cut Pro without typing them manually.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface p-4 text-left space-y-2">
              <div className="text-xs font-semibold text-ink">Included on all Pro plans:</div>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                <li>Adobe Premiere Pro Marker CSVs</li>
                <li>DaVinci Resolve EDL &amp; CSV marker tracks</li>
                <li>Final Cut Pro FCPXML marker sequences</li>
                <li>Unlimited workspace members and reviewers</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onClose}>
                Maybe Later
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Upgrade to Pro</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Active State for Pro Plan */
          <div className="mt-5 space-y-5">
            <div className="flex items-center justify-between text-xs text-muted bg-surface rounded-lg p-3 border border-line">
              <span>
                Clip: <strong className="text-ink">{media.title}</strong>
              </span>
              <span>
                Framerate: <strong className="text-ink font-mono">{fps} fps</strong>
              </span>
              <span>
                Markers: <strong className="text-ink font-mono">{validMarkers.length}</strong>
              </span>
            </div>

            {validMarkers.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">
                No timecoded comments found on this video. Add comments while playing the video to generate markers.
              </p>
            ) : (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-ink block">Select NLE Target Format</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat("premiere")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition ${
                      selectedFormat === "premiere"
                        ? "border-ink bg-surface shadow-xs"
                        : "border-line bg-paper hover:border-ink/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-ink">Adobe Premiere Pro</span>
                    <span className="text-[11px] text-muted">Marker CSV with In/Out &amp; notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat("resolve_edl")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition ${
                      selectedFormat === "resolve_edl"
                        ? "border-ink bg-surface shadow-xs"
                        : "border-line bg-paper hover:border-ink/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-ink">DaVinci Resolve EDL</span>
                    <span className="text-[11px] text-muted">CMX 3600 standard timeline locators</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat("resolve_csv")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition ${
                      selectedFormat === "resolve_csv"
                        ? "border-ink bg-surface shadow-xs"
                        : "border-line bg-paper hover:border-ink/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-ink">DaVinci Resolve CSV</span>
                    <span className="text-[11px] text-muted">Colored marker track format</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat("fcpxml")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition ${
                      selectedFormat === "fcpxml"
                        ? "border-ink bg-surface shadow-xs"
                        : "border-line bg-paper hover:border-ink/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-ink">Final Cut Pro</span>
                    <span className="text-[11px] text-muted">FCPXML sequence markers</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs text-muted">
                {validMarkers.length} timecoded note{validMarkers.length === 1 ? "" : "s"} ready
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExport}
                  disabled={validMarkers.length === 0}
                  className="gap-2"
                >
                  {copiedSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-ink" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Markers</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
