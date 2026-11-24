import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KineticTitle } from "../components/KineticTitle";
import { getGridBackdropStyle, getStageBounds, getStagePaddingStyle } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

export function Act7Outro({ copy, layout }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);
  const flashEnd = 120;

  if (frame < flashEnd) {
    const beatIdx = Math.min(3, Math.floor(frame / 30));
    const invert = beatIdx % 2 === 1;
    const localFrame = frame % 30;
    const punch = interpolate(localFrame, [0, 6, 29], [1.1, 1.0, 0.98]);
    return (
      <div
        style={{
          ...getGridBackdropStyle(!invert),
          backgroundColor: invert ? TOKENS.colors.lime : TOKENS.colors.ink,
        }}
      >
        <div
          style={{
            ...getStagePaddingStyle(layout),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "100%",
              overflowWrap: "anywhere",
              textWrap: "balance",
              fontSize: bounds.isPortrait ? 72 : 112,
              fontWeight: 900,
              letterSpacing: "-0.055em",
              color: invert ? TOKENS.colors.ink : TOKENS.colors.lime,
              transform: `scale(${punch})`,
              textAlign: "center",
            }}
          >
            {copy.act7.flashWords[beatIdx]}
          </div>
        </div>
      </div>
    );
  }

  const f = frame - flashEnd;
  const cardSpring = spring({ frame: f - 8, fps, config: SPRINGS.slam });
  const ctaPulse = 1 + Math.sin(f * 0.14) * 0.025;

  return (
    <div style={getGridBackdropStyle(false)}>
      <div
        style={{
          ...getStagePaddingStyle(layout),
          alignItems: "center",
          justifyContent: "center",
          gap: bounds.isPortrait ? 26 : 30,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            transform: `scale(${interpolate(cardSpring, [0, 1], [0.7, 1])})`,
          }}
        >
          <span
            style={{
              width: 78,
              height: 78,
              borderRadius: "22px 8px 22px 8px",
              backgroundColor: TOKENS.colors.lime,
              border: `4px solid ${TOKENS.colors.ink}`,
              boxShadow: "6px 6px 0px #11130f",
              display: "grid",
              placeItems: "center",
              fontSize: 44,
              fontWeight: 900,
              color: TOKENS.colors.ink,
            }}
          >
            F
          </span>
          <span style={{ fontSize: 58, fontWeight: 900, letterSpacing: "-0.05em", color: TOKENS.colors.ink }}>
            feedi
          </span>
        </div>

        <KineticTitle
          lines={[copy.act7.headline]}
          startFrame={flashEnd + 4}
          dark={false}
          layout={layout}
          fontSize={bounds.isPortrait ? 64 : 88}
        />

        <div
          style={{
            fontSize: bounds.isPortrait ? 25 : 30,
            fontWeight: 600,
            color: TOKENS.colors.muted,
            textAlign: "center",
            maxWidth: 880,
            overflowWrap: "anywhere",
          }}
        >
          {copy.act7.subline}
        </div>

        <div
          style={{
            marginTop: 8,
            padding: bounds.isPortrait ? "22px 36px" : "24px 52px",
            borderRadius: 24,
            backgroundColor: TOKENS.colors.ink,
            border: `4px solid ${TOKENS.colors.ink}`,
            boxShadow: "10px 10px 0px #d8ff43",
            display: "flex",
            alignItems: "center",
            gap: 20,
            transform: `scale(${interpolate(cardSpring, [0, 1], [0.85, 1]) * ctaPulse})`,
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              backgroundColor: TOKENS.colors.lime,
              color: TOKENS.colors.ink,
              fontFamily: TOKENS.fonts.mono,
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            {copy.act7.ctaLabel}
          </span>
          <span
            style={{
              fontFamily: TOKENS.fonts.mono,
              fontSize: bounds.isPortrait ? 34 : 42,
              fontWeight: 900,
              color: TOKENS.colors.paper,
            }}
          >
            {copy.act7.domain}
          </span>
        </div>

        <div
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: TOKENS.colors.surface,
            border: `2px solid ${TOKENS.colors.line}`,
            fontFamily: TOKENS.fonts.mono,
            fontSize: 17,
            fontWeight: 800,
            color: TOKENS.colors.ink,
          }}
        >
          ★ {copy.act7.ossBadge}
        </div>
      </div>
    </div>
  );
}
