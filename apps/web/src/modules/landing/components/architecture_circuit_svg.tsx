"use client";

import type { FlowMode } from "../types/architecture";

interface ArchitectureCircuitSvgProps {
  activeMode: FlowMode;
}

export function ArchitectureCircuitSvg({ activeMode }: ArchitectureCircuitSvgProps) {
  const isIngestActive = activeMode === "ingest" || activeMode === "all" || activeMode === "storage";
  const isReviewActive = activeMode === "review" || activeMode === "all";

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full z-0 overflow-visible"
      viewBox="0 0 1000 620"
      fill="none"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Client ➔ Garage S3 (Direct Multipart Upload Stream) */}
      <path
        d="M 220 180 C 400 80, 650 80, 780 180"
        stroke={isIngestActive ? "#d8ff43" : "#282b21"}
        strokeWidth={activeMode === "ingest" ? "3" : "2"}
        strokeDasharray="6 6"
        className={isIngestActive ? "animate-beam-fast" : ""}
        filter="url(#glow)"
      />

      {/* 2. Client ➔ FastAPI Gateway (REST / WebSocket) */}
      <path
        d="M 220 220 C 340 220, 360 220, 480 220"
        stroke={isReviewActive || activeMode === "ingest" ? "#81dce2" : "#282b21"}
        strokeWidth="2.5"
        strokeDasharray="8 8"
        className={isReviewActive ? "animate-beam-flow" : ""}
      />

      {/* 3. FastAPI Gateway ➔ RabbitMQ (Task Queue) */}
      <path
        d="M 520 270 L 520 390"
        stroke={activeMode === "ingest" || activeMode === "all" ? "#ff9d62" : "#282b21"}
        strokeWidth="2.5"
        strokeDasharray="8 8"
        className={activeMode === "ingest" || activeMode === "all" ? "animate-beam-flow" : ""}
      />

      {/* 4. RabbitMQ ➔ FFmpeg Worker (Transcode Job) */}
      <path
        d="M 580 430 C 660 430, 700 430, 780 430"
        stroke={activeMode === "ingest" || activeMode === "all" ? "#ff9d62" : "#282b21"}
        strokeWidth="2.5"
        strokeDasharray="8 8"
        className={activeMode === "ingest" || activeMode === "all" ? "animate-beam-fast" : ""}
      />

      {/* 5. FFmpeg Worker ➔ Garage S3 (HLS 1080p Segments) */}
      <path
        d="M 830 380 L 830 270"
        stroke={isIngestActive ? "#d8ff43" : "#282b21"}
        strokeWidth="2.5"
        strokeDasharray="8 8"
        className={isIngestActive ? "animate-beam-flow" : ""}
      />

      {/* 6. FastAPI Gateway ➔ PostgreSQL 16 (ACID DB Operations) */}
      <path
        d="M 480 260 C 380 340, 320 400, 240 430"
        stroke={activeMode === "review" || activeMode === "all" || activeMode === "storage" ? "#c9c6ff" : "#282b21"}
        strokeWidth="2.5"
        strokeDasharray="8 8"
        className={isReviewActive ? "animate-beam-flow" : ""}
      />
    </svg>
  );
}
