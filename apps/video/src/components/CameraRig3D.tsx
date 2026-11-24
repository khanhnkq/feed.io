import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { LayoutMode } from "../theme/tokens";

export interface CameraKeyframe {
  frame: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
}

interface CameraRig3DProps {
  layout: LayoutMode;
  keyframes: CameraKeyframe[];
  children: React.ReactNode;
}

function sampleTrack(
  frame: number,
  keyframes: CameraKeyframe[],
  pick: (k: CameraKeyframe) => number,
): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return pick(keyframes[0]);
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return pick(sorted[0]);
  const last = sorted[sorted.length - 1];
  if (frame >= last.frame) return pick(last);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      if (a.frame === b.frame) return pick(b);
      return interpolate(frame, [a.frame, b.frame], [pick(a), pick(b)], {
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }
  return pick(last);
}

export function CameraRig3D({ keyframes, children }: CameraRig3DProps) {
  const frame = useCurrentFrame();
  const rx = sampleTrack(frame, keyframes, (k) => k.rotateX ?? 0);
  const ry = sampleTrack(frame, keyframes, (k) => k.rotateY ?? 0);
  const rz = sampleTrack(frame, keyframes, (k) => k.rotateZ ?? 0);
  const sc = sampleTrack(frame, keyframes, (k) => k.scale ?? 1);
  const tx = sampleTrack(frame, keyframes, (k) => k.translateX ?? 0);
  const ty = sampleTrack(frame, keyframes, (k) => k.translateY ?? 0);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        perspective: "1500px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `translate3d(${tx}px, ${ty}px, 0px) scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
