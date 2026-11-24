export type LayoutMode = "landscape" | "portrait";
export type LocaleCode = "en" | "vi";
export type ActId = "act1" | "act2" | "act3" | "act4" | "act5" | "act6" | "act7";

export const TOKENS = {
  colors: {
    ink: "#11130f",
    inkElevated: "#181a14",
    inkPanel: "#1f221b",
    inkBorder: "#2e3128",
    muted: "#73766d",
    mutedLight: "#a4a89d",
    line: "#dedfd8",
    paper: "#f3f3ed",
    surface: "#fbfbf7",
    lime: "#d8ff43",
    orange: "#ff9d62",
    cyan: "#81dce2",
    lilac: "#c9c6ff",
    focus: "#6f8700",
    danger: "#ff5c5c",
    emerald: "#2bd97c",
  },
  fonts: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace",
  },
  shadows: {
    brutalLime: "6px 6px 0px #d8ff43",
    brutalInk: "6px 6px 0px #11130f",
    brutalSmLime: "4px 4px 0px #d8ff43",
    studioDepth: "0 32px 80px rgba(0, 0, 0, 0.52)",
    cardSoft: "0 20px 50px rgba(17, 19, 15, 0.14)",
  },
} as const;

export const SPRINGS = {
  snappy: { mass: 0.75, damping: 14, stiffness: 210 },
  camera: { mass: 1.15, damping: 18, stiffness: 120 },
  slam: { mass: 0.65, damping: 11, stiffness: 280 },
  wipe: { mass: 1.0, damping: 20, stiffness: 140 },
} as const;
