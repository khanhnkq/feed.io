import React from "react";
import { interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { CameraRig3D } from "../components/CameraRig3D";
import { KeycapHud } from "../components/KeycapHud";
import { getGridBackdropStyle, getStageBounds, getStagePaddingStyle } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import { formatSmpte } from "../timeline/schedule";
import type { SceneProps } from "./types";

const WAVEFORM_BARS = [28, 52, 74, 42, 88, 64, 95, 58, 40, 78, 92, 68, 46, 84, 62, 50, 76, 90, 55, 38, 70, 86, 60, 44];

export function Act3PlayerAnnotate({ copy, layout, durationInFrames, previewMode }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);

  const lockFrame = Math.floor(durationInFrames * 0.36);
  const drawStart = Math.floor(durationInFrames * 0.42);
  const commentFrame = Math.floor(durationInFrames * 0.66);

  const smpteFrame = Math.round(
    interpolate(frame, [0, lockFrame], [48, 114], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const strokeProg = interpolate(frame, [drawStart, drawStart + 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const commentPop = spring({
    frame: frame - commentFrame,
    fps,
    config: SPRINGS.snappy,
  });

  const stageW = bounds.isPortrait ? 940 : 1540;
  const videoH = bounds.isPortrait ? 500 : 590;

  return (
    <div style={getGridBackdropStyle(true)}>
      <div style={{ ...getStagePaddingStyle(layout), gap: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 16, fontWeight: 800, color: TOKENS.colors.lime }}>
              {copy.act3.badge}
            </span>
            <span
              style={{
                fontSize: bounds.isPortrait ? 42 : 50,
                fontWeight: 900,
                color: TOKENS.colors.paper,
                letterSpacing: "-0.04em",
                overflowWrap: "anywhere",
              }}
            >
              {copy.act3.headline}
            </span>
          </div>

          <div
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              backgroundColor: TOKENS.colors.inkPanel,
              border: `2px solid ${TOKENS.colors.lime}`,
              color: TOKENS.colors.lime,
              fontFamily: TOKENS.fonts.mono,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            ● {copy.act3.realtimePill}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <CameraRig3D
            layout={layout}
            keyframes={[
              { frame: 0, rotateX: 12, rotateY: 8, scale: bounds.stageScale * 0.96 },
              { frame: drawStart, rotateX: 3, rotateY: -3, scale: bounds.stageScale },
              { frame: durationInFrames, rotateX: 0, rotateY: 0, scale: bounds.stageScale * 1.02 },
            ]}
          >
            <div
              style={{
                width: stageW,
                borderRadius: 28,
                backgroundColor: TOKENS.colors.inkElevated,
                border: `3px solid ${TOKENS.colors.inkBorder}`,
                boxShadow: TOKENS.shadows.studioDepth,
                padding: 24,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 16, fontWeight: 800, color: TOKENS.colors.mutedLight }}>
                  {copy.act3.clipTitle}
                </span>
                <span
                  style={{
                    padding: "6px 16px",
                    borderRadius: 10,
                    backgroundColor: TOKENS.colors.lime,
                    color: TOKENS.colors.ink,
                    fontFamily: TOKENS.fonts.mono,
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {formatSmpte(smpteFrame, 24)} | {copy.act3.frameWord} {smpteFrame}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: bounds.isPortrait ? "column" : "row", gap: 20 }}>
                <div
                  style={{
                    flex: 1,
                    height: videoH,
                    borderRadius: 20,
                    overflow: "hidden",
                    position: "relative",
                    backgroundColor: "#0b0d09",
                    border: `2px solid ${TOKENS.colors.inkBorder}`,
                  }}
                >
                  {previewMode ? (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1d2b1f,#2f4834)" }} />
                  ) : (
                    <OffthreadVideo
                      src={staticFile("captured/hero_valley_v2.mp4")}
                      muted
                      playbackRate={0.6}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}

                  <svg
                    viewBox="0 0 1000 560"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                  >
                    <ellipse
                      cx="530"
                      cy="270"
                      rx="165"
                      ry="105"
                      fill="rgba(216, 255, 67, 0.10)"
                      stroke={TOKENS.colors.lime}
                      strokeWidth="8"
                      strokeDasharray="900"
                      strokeDashoffset={900 * (1 - strokeProg)}
                    />
                    <path
                      d="M 270 140 Q 350 185 405 225"
                      fill="none"
                      stroke={TOKENS.colors.orange}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="300"
                      strokeDashoffset={300 * (1 - strokeProg)}
                    />
                  </svg>

                  <div style={{ position: "absolute", left: 20, bottom: 20 }}>
                    <KeycapHud
                      label={copy.act3.keycapLabel}
                      keys={[
                        { label: "J", activeAt: 85 },
                        { label: "K", activeAt: 145 },
                        { label: "L", activeAt: 115 },
                      ]}
                    />
                  </div>
                </div>

                <div
                  style={{
                    width: bounds.isPortrait ? "100%" : 390,
                    borderRadius: 20,
                    backgroundColor: TOKENS.colors.inkPanel,
                    border: `2px solid ${TOKENS.colors.inkBorder}`,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 800, color: TOKENS.colors.cyan }}>
                    ● {copy.act3.annotationLabel}
                  </div>
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      backgroundColor: TOKENS.colors.ink,
                      border: `2px solid ${TOKENS.colors.lime}`,
                      boxShadow: TOKENS.shadows.brutalSmLime,
                      transform: `scale(${interpolate(commentPop, [0, 1], [0.86, 1])})`,
                      opacity: frame >= commentFrame - 4 ? 1 : 0.25,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, color: TOKENS.colors.lime, fontSize: 16 }}>
                        {copy.act3.commentAuthor}
                      </span>
                      <span style={{ fontFamily: TOKENS.fonts.mono, color: TOKENS.colors.mutedLight, fontSize: 14 }}>
                        00:00:04:18
                      </span>
                    </div>
                    <div style={{ color: TOKENS.colors.paper, fontSize: 18, lineHeight: 1.4, fontWeight: 600 }}>
                      {copy.act3.commentBody}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: 60,
                  borderRadius: 16,
                  backgroundColor: TOKENS.colors.ink,
                  border: `2px solid ${TOKENS.colors.inkBorder}`,
                  padding: "0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  position: "relative",
                }}
              >
                {WAVEFORM_BARS.map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${Math.round(h * 0.44)}px`,
                      borderRadius: 99,
                      backgroundColor: idx <= 13 ? TOKENS.colors.lime : TOKENS.colors.inkBorder,
                    }}
                  />
                ))}
                {frame >= commentFrame ? (
                  <div
                    style={{
                      position: "absolute",
                      left: "56%",
                      top: -12,
                      padding: "4px 12px",
                      borderRadius: 999,
                      backgroundColor: TOKENS.colors.lime,
                      color: TOKENS.colors.ink,
                      fontFamily: TOKENS.fonts.mono,
                      fontSize: 13,
                      fontWeight: 900,
                      transform: `scale(${commentPop})`,
                    }}
                  >
                    {copy.act3.pinBadge}
                  </div>
                ) : null}
              </div>

              <AnimatedCursor
                waypoints={[
                  { frame: drawStart - 18, x: 340, y: 210 },
                  { frame: drawStart + 30, x: 640, y: 320, click: true },
                  { frame: commentFrame, x: bounds.isPortrait ? 520 : 1240, y: bounds.isPortrait ? 720 : 340, click: true },
                ]}
              />
            </div>
          </CameraRig3D>
        </div>
      </div>
    </div>
  );
}
