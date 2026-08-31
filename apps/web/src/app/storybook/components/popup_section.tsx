"use client";

import { AlertTriangle, CheckCircle2, Film, Play, Sparkles } from "lucide-react";
import React, { useState } from "react";
import {
  Button,
  FloatingPopup,
  FloatingPopupContainer,
  type FloatingPopupPosition,
  type FloatingPopupVariant,
} from "@/modules/ui";

export function StoryboardPopupSection() {
  const [popupVariant, setPopupVariant] = useState<FloatingPopupVariant>("surface");
  const [popupPosition, setPopupPosition] = useState<FloatingPopupPosition>("bottom-right");
  const [popupProgressType, setPopupProgressType] = useState<"indeterminate" | "number" | "none">("indeterminate");
  const [popupProgressValue, setPopupProgressValue] = useState<number>(65);
  const [popupExpanded, setPopupExpanded] = useState<boolean>(false);
  const [showLivePopup, setShowLivePopup] = useState<boolean>(true);

  const liveProgress =
    popupProgressType === "none"
      ? undefined
      : popupProgressType === "indeterminate"
      ? "indeterminate"
      : popupProgressValue;

  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-focus" />
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Floating Popup & Background Progress Toast
          </h2>
        </div>
        <p className="text-xs text-muted mt-1 font-mono">
          Modules: `@/modules/ui/components/floating_popup` & `@/modules/media/components/transcoding_toast`
        </p>
      </div>

      {/* Interactive Playground Control Bar */}
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <span className="font-mono text-xs font-bold uppercase text-muted">
            Interactive Live Controls
          </span>
          <Button
            size="sm"
            variant={showLivePopup ? "danger" : "lime"}
            onClick={() => setShowLivePopup(!showLivePopup)}
          >
            {showLivePopup ? "Hide Corner Toast" : "Spawn Corner Toast"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="block text-muted font-bold mb-1.5">Variant</label>
            <div className="flex flex-wrap gap-1.5">
              {(["surface", "success", "dark", "error"] as FloatingPopupVariant[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPopupVariant(v)}
                  className={`rounded px-2.5 py-1 capitalize transition ${
                    popupVariant === v
                      ? "bg-ink text-white font-bold"
                      : "border border-line bg-paper text-ink hover:bg-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-muted font-bold mb-1.5">Position</label>
            <select
              value={popupPosition}
              onChange={(e) => setPopupPosition(e.target.value as FloatingPopupPosition)}
              className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 font-mono text-xs text-ink outline-none"
            >
              <option value="bottom-right">Bottom Right (Default)</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>

          <div>
            <label className="block text-muted font-bold mb-1.5">Progress Mode</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPopupProgressType("indeterminate")}
                className={`rounded px-2 py-1 transition ${
                  popupProgressType === "indeterminate"
                    ? "bg-ink text-lime font-bold"
                    : "border border-line bg-paper text-ink"
                }`}
              >
                Indet.
              </button>
              <button
                type="button"
                onClick={() => setPopupProgressType("number")}
                className={`rounded px-2 py-1 transition ${
                  popupProgressType === "number"
                    ? "bg-ink text-lime font-bold"
                    : "border border-line bg-paper text-ink"
                }`}
              >
                {popupProgressValue}%
              </button>
              <button
                type="button"
                onClick={() => setPopupProgressType("none")}
                className={`rounded px-2 py-1 transition ${
                  popupProgressType === "none"
                    ? "bg-ink text-lime font-bold"
                    : "border border-line bg-paper text-ink"
                }`}
              >
                None
              </button>
            </div>
          </div>

          {popupProgressType === "number" && (
            <div>
              <label className="block text-muted font-bold mb-1.5">
                Progress: {popupProgressValue}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={popupProgressValue}
                onChange={(e) => setPopupProgressValue(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </div>
          )}
        </div>
      </div>

      {/* Static Inline Variant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Surface Variant */}
        <div className="space-y-2">
          <span className="font-mono text-[11px] font-bold text-muted uppercase">
            1. Surface (Card-Inspired Background Worker)
          </span>
          <FloatingPopup
            variant="surface"
            icon={
              <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
                <Film size={18} />
              </span>
            }
            eyebrow="BACKGROUND TRANSCODING"
            title="commercial_hero_cut_4k.mov"
            description="Generating 1080p proxy & audio waveforms..."
            progress="indeterminate"
            footer={
              <>
                <span>RabbitMQ Worker</span>
                <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  Non-blocking
                </span>
              </>
            }
          />
        </div>

        {/* Success Variant */}
        <div className="space-y-2">
          <span className="font-mono text-[11px] font-bold text-muted uppercase">
            2. Success (Ready to Watch)
          </span>
          <FloatingPopup
            variant="success"
            icon={
              <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
                <CheckCircle2 size={18} />
              </span>
            }
            eyebrow="TRANSCODE COMPLETE"
            title="pinoria-demo-cinematic-hq.mp4"
            description="60 FPS • Full HD 1080p • HLS Ready"
            actions={
              <Button size="sm" variant="lime" className="gap-1.5">
                <Play size={12} className="fill-ink" />
                <span>Play</span>
              </Button>
            }
          />
        </div>

        {/* Multi-queue Expandable Variant */}
        <div className="space-y-2">
          <span className="font-mono text-[11px] font-bold text-muted uppercase">
            3. Multi-Job Queue (Expandable)
          </span>
          <FloatingPopup
            variant="surface"
            icon={
              <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
                <Film size={18} />
              </span>
            }
            eyebrow="WORKER QUEUE"
            title="3 Videos Transcoding"
            description="Processing tasks concurrently..."
            progress={75}
            isExpanded={popupExpanded}
            onToggleExpand={() => setPopupExpanded(!popupExpanded)}
            expandableContent={
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between rounded-lg border border-line p-2">
                  <span className="font-mono truncate">teaser_trailer_prores.mov</span>
                  <span className="text-[10px] font-mono text-muted">Transcoding</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line p-2">
                  <span className="font-mono truncate">interview_take_02.mp4</span>
                  <span className="text-[10px] font-mono text-muted">Queued</span>
                </div>
              </div>
            }
            footer={
              <>
                <span>Queue Length: 3 items</span>
                <span>Est. 12s remaining</span>
              </>
            }
          />
        </div>

        {/* Error Variant */}
        <div className="space-y-2">
          <span className="font-mono text-[11px] font-bold text-muted uppercase">
            4. Error / Warning
          </span>
          <FloatingPopup
            variant="error"
            icon={
              <span className="grid size-10 place-items-center rounded-lg bg-red-100 border border-red-300 font-mono text-xs font-bold text-red-700">
                <AlertTriangle size={18} />
              </span>
            }
            eyebrow="JOB FAILED"
            title="unsupported_format.avi"
            description="Unsupported video container codec."
            actions={
              <Button size="sm" variant="danger">
                Retry
              </Button>
            }
          />
        </div>
      </div>

      {/* Live Spawned Corner Toast */}
      {showLivePopup && (
        <FloatingPopupContainer position={popupPosition}>
          <FloatingPopup
            variant={popupVariant}
            icon={
              <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
                <Film size={18} />
              </span>
            }
            eyebrow="LIVE PREVIEW TOAST"
            title="demo_clip_feedio.mp4"
            description="Card-inspired notification toast"
            progress={liveProgress}
            footer={
              <>
                <span>Position: {popupPosition}</span>
                <span>Variant: {popupVariant}</span>
              </>
            }
            onClose={() => setShowLivePopup(false)}
          />
        </FloatingPopupContainer>
      )}
    </section>
  );
}
