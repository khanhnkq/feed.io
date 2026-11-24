import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { TOKENS } from "../theme/tokens";

export interface KeycapSpec {
  label: string;
  activeAt: number;
}

interface KeycapHudProps {
  label?: string;
  keys: KeycapSpec[];
}

export function KeycapHud({ label, keys }: KeycapHudProps) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 20px",
        borderRadius: 18,
        backgroundColor: "rgba(17, 19, 15, 0.92)",
        border: `2px solid ${TOKENS.colors.inkBorder}`,
        boxShadow: TOKENS.shadows.studioDepth,
      }}
    >
      {label ? (
        <span
          style={{
            fontFamily: TOKENS.fonts.mono,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: TOKENS.colors.mutedLight,
            marginRight: 4,
          }}
        >
          {label}
        </span>
      ) : null}
      {keys.map((k) => {
        const dt = frame - k.activeAt;
        const pressed = dt >= 0 && dt <= 22;
        const y = pressed ? interpolate(dt, [0, 5, 22], [0, 4, 0]) : 0;
        return (
          <div
            key={k.label}
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              fontFamily: TOKENS.fonts.mono,
              fontSize: 22,
              fontWeight: 900,
              backgroundColor: pressed ? TOKENS.colors.lime : TOKENS.colors.inkPanel,
              color: pressed ? TOKENS.colors.ink : TOKENS.colors.paper,
              border: `2px solid ${pressed ? TOKENS.colors.lime : TOKENS.colors.inkBorder}`,
              boxShadow: pressed ? "0 1px 0 #6f8700" : "0 5px 0 #090a08",
              transform: `translateY(${y}px)`,
            }}
          >
            {k.label}
          </div>
        );
      })}
    </div>
  );
}
