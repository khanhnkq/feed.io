import React from "react";
import { Easing, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig3D } from "../components/CameraRig3D";
import { getGridBackdropStyle, getStageBounds } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

export function Act4VersionCompare({ copy, layout, durationInFrames, previewMode }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);

  const stackSnap = spring({
    frame: frame - 35,
    fps,
    config: SPRINGS.slam,
  });

  const wipePct = interpolate(
    frame,
    [
      0,
      Math.floor(durationInFrames * 0.28),
      Math.floor(durationInFrames * 0.58),
      Math.floor(durationInFrames * 0.85),
      durationInFrames,
    ],
    [76, 22, 74, 48, 50],
    {
      easing: Easing.bezier(0.32, 0, 0.24, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const boxW = bounds.isPortrait ? 940 : 1480;
  const boxH = bounds.isPortrait ? 680 : 680;

  return (
    <div style={getGridBackdropStyle(true)}>
      <div
        style={{
          position: "absolute",
          top: bounds.safeTop,
          left: bounds.paddingX,
          right: bounds.paddingX,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          zIndex: 25,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 16, fontWeight: 800, color: TOKENS.colors.cyan }}>
            {copy.act4.badge}
          </span>
          <span style={{ fontSize: bounds.isPortrait ? 44 : 54, fontWeight: 900, color: TOKENS.colors.paper, letterSpacing: "-0.04em" }}>
            {copy.act4.headline}
          </span>
        </div>

        <div
          style={{
            padding: "10px 22px",
            borderRadius: 14,
            backgroundColor: TOKENS.colors.lime,
            color: TOKENS.colors.ink,
            border: `3px solid ${TOKENS.colors.ink}`,
            boxShadow: "5px 5px 0px rgba(243,243,237,0.28)",
            fontFamily: TOKENS.fonts.mono,
            fontSize: 16,
            fontWeight: 900,
            transform: `scale(${interpolate(stackSnap, [0, 1], [0.75, 1])})`,
          }}
        >
          {copy.act4.stackBadge}
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, paddingTop: bounds.isPortrait ? 280 : 165 }}>
        <CameraRig3D
          layout={layout}
          keyframes={[
            { frame: 0, rotateX: 14, rotateY: -8, scale: bounds.isPortrait ? 0.9 : 0.9 },
            { frame: Math.floor(durationInFrames * 0.5), rotateX: 3, rotateY: 4, scale: bounds.isPortrait ? 0.98 : 1.0 },
            { frame: durationInFrames, rotateX: 0, rotateY: 0, scale: bounds.isPortrait ? 1.0 : 1.03 },
          ]}
        >
          <div
            style={{
              width: boxW,
              height: boxH,
              borderRadius: 28,
              overflow: "hidden",
              position: "relative",
              border: `3px solid ${TOKENS.colors.lime}`,
              boxShadow: `${TOKENS.shadows.studioDepth}, 8px 8px 0px ${TOKENS.colors.lime}`,
              backgroundColor: "#0d0f0b",
            }}
          >
            {previewMode ? (
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,#255c3c,#6ca341)" }} />
            ) : (
              <OffthreadVideo
                src={staticFile("captured/hero_valley_v2.mp4")}
                muted
                playbackRate={0.72}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 ${100 - wipePct}% 0 0)`,
              }}
            >
              {previewMode ? (
                <div style={{ width: "100%", height: "100%", background: "#5c6058" }} />
              ) : (
                <OffthreadVideo
                  src={staticFile("captured/hero_valley_v1_log.mp4")}
                  muted
                  playbackRate={0.72}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>

            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${wipePct}%`,
                width: 6,
                marginLeft: -3,
                backgroundColor: TOKENS.colors.lime,
                boxShadow: "0 0 24px rgba(216,255,67,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 999,
                  backgroundColor: TOKENS.colors.lime,
                  color: TOKENS.colors.ink,
                  border: `4px solid ${TOKENS.colors.ink}`,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: TOKENS.fonts.mono,
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {"<>"}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: 24,
                left: 24,
                padding: "8px 18px",
                borderRadius: 10,
                backgroundColor: "rgba(17,19,15,0.88)",
                color: TOKENS.colors.mutedLight,
                fontFamily: TOKENS.fonts.mono,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {copy.act4.leftLabel}
            </div>

            <div
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                padding: "8px 18px",
                borderRadius: 10,
                backgroundColor: TOKENS.colors.lime,
                color: TOKENS.colors.ink,
                fontFamily: TOKENS.fonts.mono,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              {copy.act4.rightLabel}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 22,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 24px",
                borderRadius: 999,
                backgroundColor: "rgba(17,19,15,0.92)",
                border: `2px solid ${TOKENS.colors.cyan}`,
                color: TOKENS.colors.cyan,
                fontFamily: TOKENS.fonts.mono,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              ● {copy.act4.driftHud}
            </div>
          </div>
        </CameraRig3D>
      </div>
    </div>
  );
}
