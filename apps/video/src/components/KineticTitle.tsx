import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { getStageBounds } from "../layout/stage";
import { type LayoutMode, SPRINGS, TOKENS } from "../theme/tokens";

interface KineticTitleProps {
  lines: string[];
  accentIndex?: number;
  startFrame?: number;
  dark?: boolean;
  layout?: LayoutMode;
  align?: "center" | "left";
  fontSize?: number;
}

export function KineticTitle({
  lines,
  accentIndex,
  startFrame = 0,
  dark = true,
  layout = "landscape",
  align = "center",
  fontSize,
}: KineticTitleProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounds = getStageBounds(layout);
  const resolvedSize = fontSize ?? (bounds.isPortrait ? 58 : 76);

  return (
    <div
      style={{
        maxWidth: bounds.width - bounds.paddingX * 2,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        gap: bounds.isPortrait ? 14 : 16,
      }}
    >
      {lines.map((line, index) => {
        const delay = startFrame + index * 10;
        const prog = spring({
          frame: frame - delay,
          fps,
          config: SPRINGS.slam,
        });
        const y = interpolate(prog, [0, 1], [44, 0]);
        const opacity = interpolate(frame - delay, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isAccent = accentIndex === index;
        const baseStyle: React.CSSProperties = {
          transform: `translateY(${y}px) scale(${interpolate(prog, [0, 1], [0.92, 1])})`,
          opacity,
          fontSize: resolvedSize,
          fontWeight: 900,
          letterSpacing: "-0.05em",
          lineHeight: 1.04,
          overflowWrap: "anywhere",
          textWrap: "balance",
          color: isAccent
            ? TOKENS.colors.ink
            : dark
              ? TOKENS.colors.paper
              : TOKENS.colors.ink,
          backgroundColor: isAccent ? TOKENS.colors.lime : "transparent",
          padding: isAccent ? "8px 24px" : "0px",
          borderRadius: isAccent ? 18 : 0,
          border: isAccent ? `3px solid ${TOKENS.colors.ink}` : "none",
          boxShadow: isAccent
            ? dark
              ? "6px 6px 0px rgba(243,243,237,0.22)"
              : TOKENS.shadows.brutalInk
            : "none",
        };
        return (
          <div key={`${index}-${line}`} style={baseStyle}>
            {line}
          </div>
        );
      })}
    </div>
  );
}
