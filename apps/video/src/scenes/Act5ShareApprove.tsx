import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { CameraRig3D } from "../components/CameraRig3D";
import { getGridBackdropStyle, getStageBounds } from "../layout/stage";
import { SPRINGS, TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

export function Act5ShareApprove({ copy, layout, durationInFrames }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);

  const approveFrame = Math.floor(durationInFrames * 0.44);
  const nleFrame = Math.floor(durationInFrames * 0.7);
  const stampSpring = spring({ frame: frame - approveFrame, fps, config: SPRINGS.slam });
  const kanbanSlide = spring({ frame: frame - (approveFrame + 14), fps, config: SPRINGS.snappy });
  const toastSpring = spring({ frame: frame - nleFrame, fps, config: SPRINGS.snappy });
  const bellSwing =
    frame >= approveFrame && frame <= approveFrame + 45
      ? Math.sin((frame - approveFrame) * 0.9) * 18
      : 0;

  return (
    <div style={getGridBackdropStyle(false)}>
      <div
        style={{
          position: "absolute",
          top: bounds.safeTop,
          left: bounds.paddingX,
          right: bounds.paddingX,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          zIndex: 25,
        }}
      >
        <span
          style={{
            padding: "7px 18px",
            borderRadius: 999,
            backgroundColor: TOKENS.colors.ink,
            color: TOKENS.colors.lime,
            fontFamily: TOKENS.fonts.mono,
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {copy.act5.badge}
        </span>
        <span style={{ fontSize: bounds.isPortrait ? 46 : 56, fontWeight: 900, color: TOKENS.colors.ink, letterSpacing: "-0.045em", textAlign: "center" }}>
          {copy.act5.headline}
        </span>
      </div>

      <div style={{ position: "absolute", inset: 0, paddingTop: bounds.isPortrait ? 280 : 175 }}>
        <CameraRig3D
          layout={layout}
          keyframes={[
            { frame: 0, rotateX: 12, rotateY: -10, scale: bounds.isPortrait ? 0.9 : 0.92 },
            { frame: approveFrame, rotateX: 4, rotateY: 4, scale: bounds.isPortrait ? 0.98 : 1.0 },
            { frame: durationInFrames, rotateX: 0, rotateY: 0, scale: bounds.isPortrait ? 1.0 : 1.02 },
          ]}
        >
          <div
            style={{
              width: bounds.isPortrait ? 940 : 1480,
              display: "flex",
              flexDirection: bounds.isPortrait ? "column" : "row",
              gap: 28,
              position: "relative",
            }}
          >
            {/* Guest Share Portal Card */}
            <div
              style={{
                flex: 1,
                borderRadius: 26,
                backgroundColor: TOKENS.colors.surface,
                border: `3px solid ${TOKENS.colors.ink}`,
                boxShadow: "8px 8px 0px #11130f",
                padding: 30,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    backgroundColor: TOKENS.colors.lime,
                    border: `2px solid ${TOKENS.colors.ink}`,
                    fontFamily: TOKENS.fonts.mono,
                    fontSize: 14,
                    fontWeight: 900,
                    color: TOKENS.colors.ink,
                  }}
                >
                  {copy.act5.guestBadge}
                </span>
                <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 700, color: TOKENS.colors.muted }}>
                  /share/summer-cut-v2
                </span>
              </div>

              <div style={{ fontSize: 24, fontWeight: 900, color: TOKENS.colors.ink }}>
                {copy.act5.shareTitle}
              </div>

              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: 14,
                  backgroundColor: TOKENS.colors.paper,
                  border: `2px solid ${TOKENS.colors.line}`,
                  fontFamily: TOKENS.fonts.mono,
                  fontSize: 22,
                  letterSpacing: "0.24em",
                  color: TOKENS.colors.ink,
                  fontWeight: 900,
                }}
              >
                {frame > 55 ? "UNLOCKED ✓" : "••••••••••"}
              </div>

              <div
                style={{
                  marginTop: "auto",
                  padding: "18px 26px",
                  borderRadius: 16,
                  backgroundColor: frame >= approveFrame ? TOKENS.colors.emerald : TOKENS.colors.ink,
                  color: frame >= approveFrame ? TOKENS.colors.ink : TOKENS.colors.lime,
                  fontWeight: 900,
                  fontSize: 22,
                  textAlign: "center",
                  border: `3px solid ${TOKENS.colors.ink}`,
                }}
              >
                {frame >= approveFrame ? `✓ ${copy.act5.approvedStamp}` : "Approve Final Cut"}
              </div>

              {frame >= approveFrame ? (
                <div
                  style={{
                    position: "absolute",
                    right: 26,
                    top: 90,
                    padding: "10px 24px",
                    borderRadius: 14,
                    backgroundColor: TOKENS.colors.emerald,
                    color: TOKENS.colors.ink,
                    border: `4px solid ${TOKENS.colors.ink}`,
                    boxShadow: "6px 6px 0px #11130f",
                    fontFamily: TOKENS.fonts.mono,
                    fontSize: 28,
                    fontWeight: 900,
                    transform: `rotate(-8deg) scale(${interpolate(stampSpring, [0, 1], [1.8, 1])})`,
                  }}
                >
                  {copy.act5.approvedStamp}
                </div>
              ) : null}
            </div>

            {/* Editor Realtime Sync & Kanban + NLE Export */}
            <div
              style={{
                flex: 1,
                borderRadius: 26,
                backgroundColor: TOKENS.colors.ink,
                border: `3px solid ${TOKENS.colors.ink}`,
                boxShadow: "8px 8px 0px #d8ff43",
                padding: 30,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: TOKENS.fonts.mono, fontSize: 15, fontWeight: 800, color: TOKENS.colors.lime }}>
                  EDITOR WORKSPACE · LIVE SYNC
                </span>
                <span
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    backgroundColor: frame >= approveFrame ? TOKENS.colors.lime : TOKENS.colors.inkPanel,
                    color: frame >= approveFrame ? TOKENS.colors.ink : TOKENS.colors.paper,
                    fontWeight: 900,
                    fontSize: 16,
                    transform: `rotate(${bellSwing}deg)`,
                  }}
                >
                  🔔 {frame >= approveFrame ? "1 NEW" : "READY"}
                </span>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 16,
                  backgroundColor: TOKENS.colors.inkPanel,
                  border: `2px solid ${frame >= approveFrame ? TOKENS.colors.emerald : TOKENS.colors.inkBorder}`,
                  color: TOKENS.colors.paper,
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                {copy.act5.notificationText}
              </div>

              {/* Mini Kanban Columns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, position: "relative" }}>
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: TOKENS.colors.inkElevated, border: `2px solid ${TOKENS.colors.inkBorder}` }}>
                  <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, color: TOKENS.colors.mutedLight, marginBottom: 8 }}>
                    IN REVIEW
                  </div>
                  <div style={{ height: 52, borderRadius: 10, border: `2px dashed ${TOKENS.colors.inkBorder}` }} />
                </div>
                <div style={{ padding: 14, borderRadius: 14, backgroundColor: TOKENS.colors.inkElevated, border: `2px solid ${TOKENS.colors.emerald}` }}>
                  <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, color: TOKENS.colors.emerald, marginBottom: 8 }}>
                    APPROVED
                  </div>
                  <div style={{ height: 52 }} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 38,
                    left: `${interpolate(kanbanSlide, [0, 1], [3, 53])}%`,
                    width: "44%",
                    height: 52,
                    borderRadius: 10,
                    backgroundColor: frame >= approveFrame ? TOKENS.colors.emerald : TOKENS.colors.orange,
                    color: TOKENS.colors.ink,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  Summer_Cut_V2.mp4
                </div>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  padding: "14px 20px",
                  borderRadius: 14,
                  backgroundColor: TOKENS.colors.lime,
                  color: TOKENS.colors.ink,
                  fontFamily: TOKENS.fonts.mono,
                  fontSize: 15,
                  fontWeight: 900,
                  transform: `scale(${interpolate(toastSpring, [0, 1], [0.88, 1])})`,
                  opacity: frame >= nleFrame - 10 ? 1 : 0.3,
                }}
              >
                ⬇ {copy.act5.nleToast}
              </div>
            </div>

            <AnimatedCursor
              waypoints={[
                { frame: 40, x: 280, y: 190, click: true },
                { frame: approveFrame, x: 340, y: 310, click: true },
                { frame: nleFrame, x: bounds.isPortrait ? 460 : 1080, y: bounds.isPortrait ? 860 : 350, click: true },
              ]}
            />
          </div>
        </CameraRig3D>
      </div>
    </div>
  );
}
