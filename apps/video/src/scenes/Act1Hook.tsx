import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KineticTitle } from "../components/KineticTitle";
import { getGridBackdropStyle, getStageBounds, getStagePaddingStyle } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

export function Act1Hook({ copy, layout, durationInFrames }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);
  const splitFrame = Math.floor(durationInFrames * 0.58);
  const isReveal = frame >= splitFrame;

  const seatCount = Math.round(
    interpolate(frame, [25, splitFrame - 35], [1, 25], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const monthlyCost = seatCount * 25;
  const shakeX =
    frame > 70 && !isReveal ? Math.sin(frame * 1.45) * interpolate(seatCount, [5, 25], [2, 9]) : 0;

  const wipeProg = interpolate(frame, [splitFrame - 12, splitFrame + 14], [-120, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const revealSpring = spring({
    frame: frame - splitFrame,
    fps,
    config: SPRINGS.slam,
  });

  return (
    <div style={getGridBackdropStyle(!isReveal)}>
      {!isReveal ? (
        <div
          style={{
            ...getStagePaddingStyle(layout),
            alignItems: "center",
            justifyContent: "center",
            gap: bounds.isPortrait ? 28 : 34,
            transform: `translateX(${shakeX}px)`,
          }}
        >
          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              backgroundColor: "rgba(255, 92, 92, 0.16)",
              border: `2px solid ${TOKENS.colors.danger}`,
              color: TOKENS.colors.danger,
              fontFamily: TOKENS.fonts.mono,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.14em",
            }}
          >
            {copy.act1.eyebrow}
          </div>

          <KineticTitle
            lines={[copy.act1.painHeadline]}
            dark
            layout={layout}
            fontSize={bounds.isPortrait ? 66 : 92}
          />

          <div
            style={{
              padding: bounds.isPortrait ? "26px 34px" : "30px 48px",
              borderRadius: 28,
              backgroundColor: TOKENS.colors.inkPanel,
              border: `3px solid ${TOKENS.colors.danger}`,
              boxShadow: "8px 8px 0px #ff5c5c",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: TOKENS.fonts.mono,
                fontSize: bounds.isPortrait ? 56 : 74,
                fontWeight: 900,
                color: TOKENS.colors.danger,
              }}
            >
              ${monthlyCost} {copy.act1.perMonthSuffix}
            </div>
            <div
              style={{
                fontFamily: TOKENS.fonts.mono,
                fontSize: bounds.isPortrait ? 20 : 24,
                fontWeight: 700,
                color: TOKENS.colors.paper,
                textAlign: "center",
              }}
            >
              {seatCount} {copy.act1.activeSeatsLabel} · {copy.act1.seatFormula}
            </div>
          </div>

          <div
            style={{
              fontSize: bounds.isPortrait ? 26 : 32,
              fontWeight: 700,
              color: TOKENS.colors.mutedLight,
              textAlign: "center",
            }}
          >
            {copy.act1.painSubline}
          </div>
        </div>
      ) : (
        <div
          style={{
            ...getStagePaddingStyle(layout),
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: bounds.isPortrait ? 118 : 132,
              height: bounds.isPortrait ? 118 : 132,
              borderRadius: "32px 12px 32px 12px",
              backgroundColor: TOKENS.colors.lime,
              border: `4px solid ${TOKENS.colors.ink}`,
              boxShadow: "10px 10px 0px #11130f",
              display: "grid",
              placeItems: "center",
              fontSize: bounds.isPortrait ? 68 : 78,
              fontWeight: 900,
              color: TOKENS.colors.ink,
              transform: `scale(${interpolate(revealSpring, [0, 1], [0.4, 1])}) rotate(${interpolate(revealSpring, [0, 1], [-14, 0])}deg)`,
            }}
          >
            F
          </div>

          <KineticTitle
            lines={[copy.act1.brandReveal, copy.act1.tagline]}
            accentIndex={1}
            startFrame={splitFrame + 4}
            dark={false}
            layout={layout}
            fontSize={bounds.isPortrait ? 64 : 88}
          />
        </div>
      )}

      {frame >= splitFrame - 12 && frame <= splitFrame + 14 ? (
        <div
          style={{
            position: "absolute",
            top: "-20%",
            bottom: "-20%",
            width: "55%",
            left: `${wipeProg}%`,
            transform: "skewX(-18deg)",
            backgroundColor: TOKENS.colors.lime,
            borderLeft: `8px solid ${TOKENS.colors.ink}`,
            borderRight: `8px solid ${TOKENS.colors.ink}`,
            zIndex: 80,
          }}
        />
      ) : null}
    </div>
  );
}
