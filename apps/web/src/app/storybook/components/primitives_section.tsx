"use client";

import { Radio, Sparkles } from "lucide-react";
import React, { useState } from "react";
import {
  Badge,
  ProgressBar,
  WaveformVisualizer,
} from "@/modules/ui";

export function StoryboardPrimitivesSection() {
  const [progressVal, setProgressVal] = useState<number>(68);
  const [waveformSeek, setWaveformSeek] = useState<number>(0.45);

  const samplePeaks = [
    0.15, 0.35, 0.65, 0.9, 0.45, 0.75, 0.85, 0.3, 0.5, 0.95,
    0.8, 0.6, 0.4, 0.7, 0.85, 0.9, 0.35, 0.2, 0.55, 0.8,
    0.95, 0.6, 0.4, 0.3, 0.7, 0.85, 0.9, 0.65, 0.5, 0.75,
    0.85, 0.95, 0.7, 0.4, 0.3, 0.6, 0.8, 0.9, 0.55, 0.35,
    0.2, 0.5, 0.75, 0.9, 0.85, 0.65, 0.4, 0.6, 0.8, 0.95,
  ];

  return (
    <section className="space-y-8">
      <div className="border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-focus" />
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Primitives (Badges, Progress Bars & Audio Waveforms)
          </h2>
        </div>
        <p className="text-xs text-muted mt-1 font-mono">
          Modules: @/modules/ui/components (Badge, ProgressBar, WaveformVisualizer)
        </p>
      </div>

      {/* 1. Badges System */}
      <div className="rounded-xl border border-line bg-surface p-6 space-y-6">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-muted mb-3">
            Badge Variants
          </h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="lime">Lime Accent</Badge>
            <Badge variant="ink">Dark Ink</Badge>
            <Badge variant="surface">Surface</Badge>
            <Badge variant="paper">Paper Neutral</Badge>
            <Badge variant="success">Success / Ready</Badge>
            <Badge variant="danger">Error / Failed</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>

        <div>
          <h3 className="font-mono text-xs font-bold uppercase text-muted mb-3">
            Badges with Indicator Dots & Sizes
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Badge size="sm" variant="lime" dot>
              60 FPS (sm)
            </Badge>
            <Badge size="md" variant="ink" dot>
              1080P HD (md)
            </Badge>
            <Badge size="lg" variant="success" dot>
              HLS Master Ready (lg)
            </Badge>
            <Badge size="md" variant="danger" dot>
              Transcode Failed
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Progress Bars System */}
      <div className="rounded-xl border border-line bg-surface p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-mono text-xs font-bold uppercase text-muted">
            Interactive Progress Bar Controls
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink font-bold">{progressVal}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressVal}
              onChange={(e) => setProgressVal(Number(e.target.value))}
              className="accent-ink w-32"
            />
          </div>
        </div>

        <div className="space-y-4">
          <ProgressBar
            value={progressVal}
            variant="ink"
            size="md"
            label="Upload Progress (Ink Variant)"
            showValue
          />
          <ProgressBar
            value={progressVal}
            variant="lime"
            size="md"
            label="Transcoding Worker (Lime Variant)"
            showValue
          />
          <ProgressBar
            value="indeterminate"
            variant="lime"
            size="sm"
            label="Indeterminate Background Job (Small)"
          />
        </div>
      </div>

      {/* 3. Audio Waveform Visualizer */}
      <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-muted" />
            <h3 className="font-mono text-xs font-bold uppercase text-muted">
              Interactive Audio Waveform Visualizer
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-ink">
            Seek: {Math.round(waveformSeek * 100)}%
          </span>
        </div>

        <p className="text-xs text-muted">
          Click anywhere along the waveform to seek to that timestamp position.
        </p>

        <WaveformVisualizer
          peaks={samplePeaks}
          progress={waveformSeek}
          interactive
          onSeek={setWaveformSeek}
          height={48}
        />
      </div>
    </section>
  );
}
