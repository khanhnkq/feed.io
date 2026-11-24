import type React from "react";
import { TOKENS } from "../theme/tokens";

interface BrowserFrameProps {
  url: string;
  badge?: string;
  width?: number;
  height?: number;
  highlightUrl?: boolean;
  children: React.ReactNode;
}

export function BrowserFrame({
  url,
  badge,
  width = 1480,
  height = 860,
  highlightUrl = false,
  children,
}: BrowserFrameProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 26,
        backgroundColor: TOKENS.colors.inkElevated,
        border: `3px solid ${TOKENS.colors.ink}`,
        boxShadow: `${TOKENS.shadows.studioDepth}, 10px 10px 0px ${TOKENS.colors.lime}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 62,
          padding: "0 24px",
          backgroundColor: TOKENS.colors.ink,
          borderBottom: `2px solid ${TOKENS.colors.inkBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 14, height: 14, borderRadius: 99, background: "#ff5f56" }} />
          <span style={{ width: 14, height: 14, borderRadius: 99, background: "#ffbd2e" }} />
          <span style={{ width: 14, height: 14, borderRadius: 99, background: "#27c93f" }} />
        </div>

        <div
          style={{
            padding: "8px 22px",
            borderRadius: 999,
            backgroundColor: highlightUrl ? TOKENS.colors.lime : TOKENS.colors.inkPanel,
            color: highlightUrl ? TOKENS.colors.ink : TOKENS.colors.paper,
            border: `2px solid ${highlightUrl ? TOKENS.colors.lime : TOKENS.colors.inkBorder}`,
            fontFamily: TOKENS.fonts.mono,
            fontSize: 18,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              backgroundColor: highlightUrl ? TOKENS.colors.ink : TOKENS.colors.emerald,
            }}
          />
          <span>{url}</span>
        </div>

        <div style={{ minWidth: 110, display: "flex", justifyContent: "flex-end" }}>
          {badge ? (
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                backgroundColor: TOKENS.colors.lime,
                color: TOKENS.colors.ink,
                fontFamily: TOKENS.fonts.mono,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
}
