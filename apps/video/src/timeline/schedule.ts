import type { ActId, LayoutMode } from "../theme/tokens";

export type SfxKind =
  | "impact"
  | "tick"
  | "whoosh"
  | "click"
  | "brush"
  | "pop"
  | "wipe"
  | "chime"
  | "riser"
  | "resolve";

export interface ActSpan {
  start: number;
  duration: number;
}

export interface SfxCue {
  frame: number;
  kind: SfxKind;
}

export interface TimelineSchedule {
  fps: 60;
  bpm: 120;
  width: number;
  height: number;
  totalFrames: number;
  acts: Record<ActId, ActSpan>;
  sfxCues: SfxCue[];
}

const ACT_ORDER: ActId[] = ["act1", "act2", "act3", "act4", "act5", "act6", "act7"];

const DURATIONS: Record<LayoutMode, Record<ActId, number>> = {
  landscape: {
    act1: 480,
    act2: 480,
    act3: 720,
    act4: 600,
    act5: 600,
    act6: 540,
    act7: 540,
  },
  portrait: {
    act1: 330,
    act2: 300,
    act3: 480,
    act4: 420,
    act5: 420,
    act6: 360,
    act7: 330,
  },
};

function buildCues(acts: Record<ActId, ActSpan>): SfxCue[] {
  const cues: SfxCue[] = [
    { frame: acts.act1.start + 0, kind: "impact" },
    { frame: acts.act1.start + 60, kind: "tick" },
    { frame: acts.act1.start + 90, kind: "tick" },
    { frame: acts.act1.start + 120, kind: "tick" },
    { frame: acts.act1.start + 150, kind: "tick" },
    { frame: acts.act1.start + Math.floor(acts.act1.duration * 0.56), kind: "whoosh" },
    { frame: acts.act1.start + Math.floor(acts.act1.duration * 0.62), kind: "impact" },

    { frame: acts.act2.start + 0, kind: "whoosh" },
    { frame: acts.act2.start + 90, kind: "click" },
    { frame: acts.act2.start + 180, kind: "pop" },

    { frame: acts.act3.start + 0, kind: "whoosh" },
    { frame: acts.act3.start + 90, kind: "click" },
    { frame: acts.act3.start + 120, kind: "click" },
    { frame: acts.act3.start + 150, kind: "click" },
    { frame: acts.act3.start + Math.floor(acts.act3.duration * 0.42), kind: "brush" },
    { frame: acts.act3.start + Math.floor(acts.act3.duration * 0.68), kind: "pop" },

    { frame: acts.act4.start + 0, kind: "whoosh" },
    { frame: acts.act4.start + 75, kind: "pop" },
    { frame: acts.act4.start + Math.floor(acts.act4.duration * 0.35), kind: "wipe" },
    { frame: acts.act4.start + Math.floor(acts.act4.duration * 0.7), kind: "wipe" },

    { frame: acts.act5.start + 0, kind: "whoosh" },
    { frame: acts.act5.start + 75, kind: "click" },
    { frame: acts.act5.start + Math.floor(acts.act5.duration * 0.45), kind: "chime" },
    { frame: acts.act5.start + Math.floor(acts.act5.duration * 0.72), kind: "pop" },

    { frame: acts.act6.start + 0, kind: "riser" },
    { frame: acts.act6.start + 90, kind: "tick" },
    { frame: acts.act6.start + 180, kind: "tick" },
    { frame: acts.act6.start + Math.floor(acts.act6.duration * 0.62), kind: "whoosh" },

    { frame: acts.act7.start + 0, kind: "impact" },
    { frame: acts.act7.start + 30, kind: "pop" },
    { frame: acts.act7.start + 60, kind: "pop" },
    { frame: acts.act7.start + 90, kind: "pop" },
    { frame: acts.act7.start + 135, kind: "resolve" },
  ];
  return cues.sort((a, b) => a.frame - b.frame);
}

export function getTimelineSchedule(layout: LayoutMode): TimelineSchedule {
  const durations = DURATIONS[layout];
  const acts = {} as Record<ActId, ActSpan>;
  let cursor = 0;
  for (const id of ACT_ORDER) {
    acts[id] = { start: cursor, duration: durations[id] };
    cursor += durations[id];
  }

  return {
    fps: 60,
    bpm: 120,
    width: layout === "landscape" ? 1920 : 1080,
    height: layout === "landscape" ? 1080 : 1920,
    totalFrames: cursor,
    acts,
    sfxCues: buildCues(acts),
  };
}

export function formatSmpte(frameIndex: number, fps = 24): string {
  const safeFrame = Math.max(0, Math.floor(frameIndex));
  const totalSeconds = Math.floor(safeFrame / fps);
  const f = safeFrame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}
