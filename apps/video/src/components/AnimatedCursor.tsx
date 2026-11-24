import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { TOKENS } from "../theme/tokens";

export interface CursorWaypoint {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

interface AnimatedCursorProps {
  waypoints: CursorWaypoint[];
}

export function AnimatedCursor({ waypoints }: AnimatedCursorProps) {
  const frame = useCurrentFrame();
  if (waypoints.length === 0) return null;
  const sorted = [...waypoints].sort((a, b) => a.frame - b.frame);

  let x = sorted[0].x;
  let y = sorted[0].y;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const span = Math.max(1, b.frame - a.frame);
      x = interpolate(frame, [a.frame, a.frame + span], [a.x, b.x], {
        easing: Easing.bezier(0.25, 1, 0.4, 1),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      y = interpolate(frame, [a.frame, a.frame + span], [a.y, b.y], {
        easing: Easing.bezier(0.25, 1, 0.4, 1),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      break;
    }
    if (frame > b.frame) {
      x = b.x;
      y = b.y;
    }
  }

  const activeClick = sorted.find((w) => w.click && frame >= w.frame && frame <= w.frame + 18);
  const clickProgress = activeClick ? (frame - activeClick.frame) / 18 : 0;
  const scale = activeClick ? interpolate(clickProgress, [0, 0.35, 1], [1, 0.82, 1]) : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0px)`,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {activeClick ? (
        <div
          style={{
            position: "absolute",
            left: -26,
            top: -26,
            width: 52,
            height: 52,
            borderRadius: 999,
            border: `4px solid ${TOKENS.colors.lime}`,
            transform: `scale(${interpolate(clickProgress, [0, 1], [0.4, 1.8])})`,
            opacity: interpolate(clickProgress, [0, 1], [1, 0]),
          }}
        />
      ) : null}
      <svg
        width="38"
        height="42"
        viewBox="0 0 38 42"
        style={{
          transform: `scale(${scale})`,
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.45))",
        }}
      >
        <path
          d="M4 3L33 19L19 23L25 37L18 40L12 26L4 33V3Z"
          fill={TOKENS.colors.lime}
          stroke={TOKENS.colors.ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
