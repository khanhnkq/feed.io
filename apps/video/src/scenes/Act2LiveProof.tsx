import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { BrowserFrame } from "../components/BrowserFrame";
import { CameraRig3D } from "../components/CameraRig3D";
import { getGridBackdropStyle, getStageBounds } from "../layout/stage";
import { TOKENS } from "../theme/tokens";
import type { SceneProps } from "./types";

export function Act2LiveProof({ copy, layout, durationInFrames }: SceneProps) {
  const frame = useCurrentFrame();
  const bounds = getStageBounds(layout);
  const roleIdx =
    Math.floor(
      interpolate(frame, [0, durationInFrames - 1], [0, copy.act2.roles.length - 0.01], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ) % copy.act2.roles.length;

  const imgScrollY = interpolate(frame, [40, durationInFrames - 30], [0, -140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const frameWidth = bounds.isPortrait ? 940 : 1480;
  const frameHeight = bounds.isPortrait ? 760 : 740;

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
          gap: 14,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              backgroundColor: TOKENS.colors.ink,
              color: TOKENS.colors.lime,
              fontFamily: TOKENS.fonts.mono,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.12em",
            }}
          >
            ● {copy.act2.badge}
          </span>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: 12,
              backgroundColor: TOKENS.colors.lime,
              color: TOKENS.colors.ink,
              border: `2px solid ${TOKENS.colors.ink}`,
              boxShadow: "4px 4px 0px #11130f",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            Built for {copy.act2.roles[roleIdx]}
          </span>
        </div>

        <div
          style={{
            fontSize: bounds.isPortrait ? 48 : 56,
            fontWeight: 900,
            letterSpacing: "-0.045em",
            color: TOKENS.colors.ink,
            textAlign: "center",
          }}
        >
          {copy.act2.headline}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: bounds.isPortrait ? 340 : 185,
        }}
      >
        <CameraRig3D
          layout={layout}
          keyframes={[
            { frame: 0, rotateX: 18, rotateY: -15, rotateZ: -2, scale: bounds.isPortrait ? 0.86 : 0.84, translateY: 70 },
            { frame: Math.floor(durationInFrames * 0.42), rotateX: 6, rotateY: 4, rotateZ: 0, scale: bounds.isPortrait ? 0.96 : 0.96, translateY: 10 },
            { frame: durationInFrames, rotateX: 2, rotateY: -3, rotateZ: 0, scale: bounds.isPortrait ? 1.02 : 1.04, translateY: -10 },
          ]}
        >
          <div style={{ position: "relative" }}>
            <BrowserFrame
              url={copy.act2.url}
              badge="PRODUCTION HTTPS"
              width={frameWidth}
              height={frameHeight}
              highlightUrl={frame > 75}
            >
              <Img
                src={staticFile("captured/landing_2x.png")}
                style={{
                  width: "100%",
                  height: "auto",
                  transform: `translateY(${imgScrollY}px)`,
                }}
              />
            </BrowserFrame>
            <AnimatedCursor
              waypoints={[
                { frame: 20, x: frameWidth * 0.8, y: frameHeight * 0.55 },
                { frame: 90, x: frameWidth * 0.5, y: 32, click: true },
                { frame: 200, x: frameWidth * 0.44, y: frameHeight * 0.62, click: true },
              ]}
            />
          </div>
        </CameraRig3D>
      </div>
    </div>
  );
}
