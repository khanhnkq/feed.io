import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig3D } from "../components/CameraRig3D";
import { getGridBackdropStyle, getStageBounds, getStagePaddingStyle } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

const ACCENTS = [
  TOKENS.colors.lime,
  TOKENS.colors.cyan,
  TOKENS.colors.lilac,
  TOKENS.colors.orange,
  TOKENS.colors.emerald,
  TOKENS.colors.lime,
];

export function Act6ArchitecturePricing({ copy, layout, durationInFrames }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);
  const pricingStart = Math.floor(durationInFrames * 0.62);
  const showPricing = frame >= pricingStart;

  const flipSpring = spring({
    frame: frame - pricingStart,
    fps,
    config: SPRINGS.camera,
  });

  return (
    <div style={getGridBackdropStyle(!showPricing)}>
      {!showPricing ? (
        <div style={{ ...getStagePaddingStyle(layout), gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              zIndex: 25,
            }}
          >
            <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 16, fontWeight: 800, color: TOKENS.colors.lime }}>
              {copy.act6.badge}
            </span>
            <span
              style={{
                fontSize: bounds.isPortrait ? 44 : 54,
                fontWeight: 900,
                color: TOKENS.colors.paper,
                letterSpacing: "-0.045em",
                textAlign: "center",
                overflowWrap: "anywhere",
              }}
            >
              {copy.act6.headline}
            </span>
            <span
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                backgroundColor: TOKENS.colors.inkPanel,
                border: `2px solid ${TOKENS.colors.cyan}`,
                color: TOKENS.colors.cyan,
                fontFamily: TOKENS.fonts.mono,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {copy.act6.securityPill}
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <CameraRig3D
              layout={layout}
              keyframes={[
                { frame: 0, rotateX: 28, rotateY: -14, rotateZ: -6, scale: bounds.stageScale * 0.92 },
                { frame: pricingStart, rotateX: 16, rotateY: 8, rotateZ: 2, scale: bounds.stageScale },
              ]}
            >
              <div
                style={{
                  width: bounds.isPortrait ? 920 : 1420,
                  padding: 34,
                  borderRadius: 30,
                  backgroundColor: "rgba(24, 26, 20, 0.94)",
                  border: `3px solid ${TOKENS.colors.inkBorder}`,
                  boxShadow: TOKENS.shadows.studioDepth,
                  position: "relative",
                }}
              >
                <svg
                  viewBox="0 0 1200 500"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  {[
                    "M 220 140 L 600 140 L 980 140",
                    "M 220 360 L 600 360 L 980 360",
                    "M 600 140 L 600 360",
                  ].map((d, idx) => (
                    <path
                      key={idx}
                      d={d}
                      fill="none"
                      stroke={TOKENS.colors.lime}
                      strokeWidth="4"
                      strokeDasharray="14 14"
                      strokeDashoffset={-frame * 3.5}
                      opacity={0.55}
                    />
                  ))}
                </svg>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: bounds.isPortrait ? "1fr 1fr" : "repeat(3, 1fr)",
                    gap: 24,
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  {copy.act6.nodes.map((node, idx) => {
                    const pop = spring({
                      frame: frame - idx * 14,
                      fps,
                      config: SPRINGS.snappy,
                    });
                    const accent = ACCENTS[idx % ACCENTS.length];
                    return (
                      <div
                        key={`${idx}-${node.title}`}
                        style={{
                          padding: "24px 22px",
                          borderRadius: 22,
                          backgroundColor: TOKENS.colors.ink,
                          border: `3px solid ${accent}`,
                          boxShadow: `6px 6px 0px ${accent}`,
                          transform: `translateY(${interpolate(pop, [0, 1], [36, 0])}px) scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            alignSelf: "flex-start",
                            padding: "4px 12px",
                            borderRadius: 8,
                            backgroundColor: accent,
                            color: TOKENS.colors.ink,
                            fontFamily: TOKENS.fonts.mono,
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {node.tag}
                        </span>
                        <span style={{ fontSize: 25, fontWeight: 900, color: TOKENS.colors.paper }}>
                          {node.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CameraRig3D>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...getStagePaddingStyle(layout),
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 16,
              backgroundColor: TOKENS.colors.lime,
              border: `3px solid ${TOKENS.colors.ink}`,
              boxShadow: "6px 6px 0px #11130f",
              fontSize: bounds.isPortrait ? 38 : 50,
              fontWeight: 900,
              color: TOKENS.colors.ink,
              transform: `scale(${interpolate(flipSpring, [0, 1], [0.82, 1])})`,
              textAlign: "center",
              overflowWrap: "anywhere",
            }}
          >
            {copy.act6.pricingHeadline}
          </div>

          <div
            style={{
              fontSize: bounds.isPortrait ? 23 : 27,
              fontWeight: 700,
              color: TOKENS.colors.muted,
              textAlign: "center",
              overflowWrap: "anywhere",
            }}
          >
            {copy.act6.pricingSubline}
          </div>

          <div
            style={{
              width: bounds.isPortrait ? 920 : 1320,
              height: bounds.isPortrait ? 720 : 600,
              borderRadius: 26,
              overflow: "hidden",
              border: `4px solid ${TOKENS.colors.ink}`,
              boxShadow: "10px 10px 0px #11130f",
              transform: `scale(${interpolate(flipSpring, [0, 1], [0.88, 1])}) rotateX(${interpolate(flipSpring, [0, 1], [18, 0])}deg)`,
              backgroundColor: TOKENS.colors.surface,
            }}
          >
            <Img
              src={staticFile("captured/pricing_2x.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
