import type React from "react";
import { type LayoutMode, TOKENS } from "../theme/tokens";

export interface StageBounds {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  paddingX: number;
  stageScale: number;
  isPortrait: boolean;
}

export function getStageBounds(layout: LayoutMode): StageBounds {
  if (layout === "portrait") {
    return {
      width: 1080,
      height: 1920,
      safeTop: 156,
      safeBottom: 1680,
      paddingX: 64,
      stageScale: 0.92,
      isPortrait: true,
    };
  }
  return {
    width: 1920,
    height: 1080,
    safeTop: 64,
    safeBottom: 1016,
    paddingX: 96,
    stageScale: 1,
    isPortrait: false,
  };
}

export function getStagePaddingStyle(layout: LayoutMode): React.CSSProperties {
  const b = getStageBounds(layout);
  return {
    position: "absolute",
    inset: 0,
    paddingTop: b.safeTop,
    paddingBottom: b.height - b.safeBottom,
    paddingLeft: b.paddingX,
    paddingRight: b.paddingX,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  };
}

export function getGridBackdropStyle(dark: boolean): React.CSSProperties {
  const line = dark ? "rgba(216, 255, 67, 0.065)" : "rgba(17, 19, 15, 0.065)";
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: dark ? TOKENS.colors.ink : TOKENS.colors.paper,
    backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    overflow: "hidden",
    fontFamily: TOKENS.fonts.sans,
  };
}
