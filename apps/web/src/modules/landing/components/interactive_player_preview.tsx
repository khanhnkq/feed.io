"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Maximize2,
  MessageSquare,
  Pause,
  Play,
  Share2,
  Volume2,
} from "lucide-react";

interface CommentPin {
  id: string;
  timecode: string;
  timePercent: number;
  frameNum: number;
  author: string;
  avatarTone: "lime" | "dark";
  content: string;
  resolved: boolean;
}

const INITIAL_PINS: CommentPin[] = [
  {
    id: "1",
    timecode: "00:01:14:08",
    timePercent: 28,
    frameNum: 2264,
    author: "Elena Rostova",
    avatarTone: "lime",
    content: "Lower the highlight clipping on the hero vehicle.",
    resolved: true,
  },
  {
    id: "2",
    timecode: "00:01:24:18",
    timePercent: 55,
    frameNum: 2542,
    author: "Marc Dupond",
    avatarTone: "dark",
    content: "Frame-accurate audio sync is spot on here! Ready for final mix.",
    resolved: false,
  },
  {
    id: "3",
    timecode: "00:02:08:00",
    timePercent: 82,
    frameNum: 3840,
    author: "Client (Nike)",
    avatarTone: "lime",
    content: "Swap the ending logo lockup with the black typography version.",
    resolved: false,
  },
];

export function InteractivePlayerPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePinId, setActivePinId] = useState<string>("2");
  const [activeTab, setActiveTab] = useState<"comments" | "versions">("comments");
  const [currentFrame, setCurrentFrame] = useState(2542);
  const [progressPercent, setProgressPercent] = useState(55);

  const activePin = INITIAL_PINS.find((p) => p.id === activePinId) || INITIAL_PINS[1];

  // Sync state when pin is clicked
  const handleSelectPin = (pin: CommentPin) => {
    setActivePinId(pin.id);
    setCurrentFrame(pin.frameNum);
    setProgressPercent(pin.timePercent);
  };

  // Live video playback frame-ticking simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => prev + 1);
      setProgressPercent((prev) => (prev >= 100 ? 0 : prev + 0.25));
    }, 41.67); // ~24 fps (41.67ms per frame)

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Compute SMPTE timecode from frame count (24 fps)
  const calcTimecode = (frames: number) => {
    const totalSeconds = Math.floor(frames / 24);
    const f = frames % 24;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `00:${pad(m)}:${pad(s)}:${pad(f)}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2e3028] bg-[#141512] shadow-2xl text-white">
      {/* Studio Top Control Bar */}
      <div className="flex h-12 items-center justify-between border-b border-[#252720] px-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="grid size-3 place-items-center rounded-full bg-[#ff5f56]" />
          <span className="grid size-3 place-items-center rounded-full bg-[#ffbd2e]" />
          <span className="grid size-3 place-items-center rounded-full bg-[#27c93f]" />
          <span className="ml-2 font-mono text-[11px] font-bold text-[#a0a398]">
            COMMERCIAL_HERO_CUT_V3_4K.MOV
          </span>
          <span className="rounded bg-[#252720] px-2 py-0.5 font-mono text-[10px] text-lime">
            PRORES 422 HQ
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Animated Audio Equalizer */}
          <div className="flex items-center gap-1 px-2">
            {[40, 70, 90, 60, 80, 50].map((h, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-lime transition-all duration-150"
                style={{
                  height: isPlaying ? `${h * 0.16 + (i % 3) * 2}px` : "4px",
                  opacity: isPlaying ? 0.9 : 0.4,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-[#33362b] bg-[#1c1e18] px-2.5 py-1 text-[11px] font-bold text-white transition hover:border-lime"
          >
            <Share2 size={12} className="text-lime" /> Share Review Link
          </button>
        </div>
      </div>

      {/* Main Studio Viewport & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Video Viewport & Canvas */}
        <div className="relative flex flex-col justify-between bg-[#0b0c0a] lg:col-span-8">
          {/* Simulated Video Canvas */}
          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[#1b1e16] via-[#10120d] to-[#0a0c09] p-6 select-none">
            {/* Ambient Background Grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#d8ff43_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

            {/* Timecode Overlay */}
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-md bg-black/70 px-3 py-1 font-mono text-xs font-bold text-white backdrop-blur-sm shadow-md">
              <span
                className={`size-2 rounded-full ${
                  isPlaying ? "bg-red-500 animate-ping" : "bg-red-500"
                }`}
              />
              <span>{calcTimecode(currentFrame)}</span>
              <span className="text-[#888b80]">| FRAME {currentFrame}</span>
            </div>

            {/* Simulated Bounding Box Annotation over Video */}
            <div
              className="absolute left-[38%] top-[28%] size-[140px] rounded-lg border-2 border-lime bg-lime/10 shadow-[0_0_20px_rgba(216,255,67,0.25)] transition-all duration-300"
              style={{
                transform: activePinId === "2" ? "scale(1)" : "scale(0.9) opacity(0.3)",
              }}
            >
              <span className="absolute -top-3 left-2 rounded bg-lime px-1.5 py-0.5 font-mono text-[9px] font-black text-ink">
                #02 ANNOTATION
              </span>
              <div className="absolute -bottom-8 left-0 whitespace-nowrap rounded bg-ink/90 px-2 py-1 text-[10px] font-medium text-white border border-[#33362b] shadow-lg">
                {activePin.content}
              </div>
            </div>

            {/* Resolution watermark */}
            <div className="absolute right-5 top-5 font-mono text-[10px] text-[#606358]">
              3840 × 2160 • 24.00 FPS
            </div>
          </div>

          {/* Player Transport Controls & Timeline Scrubber */}
          <div className="border-t border-[#252720] bg-[#141512] p-4">
            {/* Scrubber Track with Pins */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                setProgressPercent(pct);
                setCurrentFrame(Math.round((pct / 100) * 4500));
              }}
              className="relative mb-3 h-6 flex items-center cursor-pointer"
            >
              <div className="h-1.5 w-full rounded-full bg-[#252720] relative">
                <div
                  className="h-full rounded-full bg-lime"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Comment Pins along Timeline */}
                {INITIAL_PINS.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPin(pin);
                    }}
                    className={`group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all ${
                      activePinId === pin.id
                        ? "size-4 border-white bg-lime ring-4 ring-lime/30 scale-110"
                        : "size-3 border-[#33362b] bg-[#252720] hover:bg-lime hover:scale-125"
                    }`}
                    style={{ left: `${pin.timePercent}%` }}
                    title={`${pin.author}: ${pin.timecode}`}
                  />
                ))}
              </div>
            </div>

            {/* Play/Pause & Transport Buttons */}
            <div className="flex items-center justify-between text-xs text-[#a0a398]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="grid size-8 place-items-center rounded-lg bg-lime font-bold text-ink transition hover:scale-105 active:scale-95"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>
                <div className="font-mono text-xs font-bold text-white">
                  {calcTimecode(currentFrame)}{" "}
                  <span className="text-[#606358]">/ 00:03:45:00</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#a0a398]">
                <Volume2 size={16} className="cursor-pointer hover:text-white" />
                <Maximize2 size={16} className="cursor-pointer hover:text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timestamped Comments Sidebar */}
        <div className="border-t border-[#252720] lg:border-l lg:border-t-0 bg-[#171914] p-4 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#252720] pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    activeTab === "comments" ? "text-lime" : "text-[#7a7d73]"
                  }`}
                >
                  <MessageSquare size={13} />
                  Comments ({INITIAL_PINS.length})
                </button>
              </div>
              <span className="rounded bg-lime/10 px-2 py-0.5 font-mono text-[9px] font-bold text-lime">
                LIVE SYNC
              </span>
            </div>

            {/* Comments List */}
            <div className="mt-3 space-y-2.5">
              {INITIAL_PINS.map((pin) => {
                const isActive = activePinId === pin.id;
                return (
                  <div
                    key={pin.id}
                    onClick={() => handleSelectPin(pin)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      isActive
                        ? "border-lime bg-[#20231b] shadow-md -translate-y-0.5"
                        : "border-[#252720] bg-[#141512] hover:border-[#383b30]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                            pin.avatarTone === "lime"
                              ? "bg-lime text-ink"
                              : "bg-[#33362b] text-white"
                          }`}
                        >
                          {pin.author.charAt(0)}
                        </span>
                        <span className="font-bold text-white text-[11px]">
                          {pin.author}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-lime">
                        {pin.timecode}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#c5c8bd] leading-relaxed">
                      {pin.content}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#7a7d73]">
                      <span>{pin.resolved ? "Resolved" : "Open discussion"}</span>
                      {pin.resolved && (
                        <span className="flex items-center gap-1 text-[#4ecb71]">
                          <CheckCircle2 size={11} /> Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick reply bar */}
          <div className="mt-4 pt-3 border-t border-[#252720]">
            <div className="flex items-center gap-2 rounded-lg border border-[#33362b] bg-[#141512] px-3 py-2 text-xs text-[#7a7d73]">
              <span className="font-mono text-[10px] text-lime">
                {calcTimecode(currentFrame)}
              </span>
              <span className="flex-1">Leave timestamped feedback…</span>
              <ChevronRight size={14} className="text-lime" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
