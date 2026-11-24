import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

let mockFrame = 180;

vi.mock("remotion", async () => {
  const actual = await vi.importActual<typeof import("remotion")>("remotion");
  return {
    ...actual,
    useCurrentFrame: () => mockFrame,
    staticFile: (p: string) => `/${p}`,
    Img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
    OffthreadVideo: () => <div data-testid="video-stub" />,
    useVideoConfig: () => ({
      fps: 60,
      width: 1080,
      height: 1920,
      durationInFrames: 420,
      id: "test",
      defaultProps: {},
      props: {},
      defaultCodec: null,
      defaultOutName: null,
      defaultVideoImageFormat: null,
      defaultPixelFormat: null,
    }),
  };
});

import { EN_COPY } from "../copy";
import type { VideoCopy } from "../copy/types";
import { Act1Hook } from "../scenes/Act1Hook";
import { Act2LiveProof } from "../scenes/Act2LiveProof";
import { Act3PlayerAnnotate } from "../scenes/Act3PlayerAnnotate";
import { Act4VersionCompare } from "../scenes/Act4VersionCompare";
import { Act5ShareApprove } from "../scenes/Act5ShareApprove";
import { Act6ArchitecturePricing } from "../scenes/Act6ArchitecturePricing";
import { Act7Outro } from "../scenes/Act7Outro";

function translateStub(val: unknown): unknown {
  if (typeof val === "string") return val === "en" ? "vi" : `VI_${val.length}`;
  if (Array.isArray(val)) return val.map(translateStub);
  if (val && typeof val === "object") {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, translateStub(v)]));
  }
  return val;
}

describe("zero-refactor Vietnamese localization readiness", () => {
  it("renders zero leftover English UI labels when all VideoCopy strings are localized", () => {
    const viCopy = translateStub(EN_COPY) as VideoCopy;
    viCopy.act2.subline = "VI_UNIQUE_ACT2_SUBLINE";
    const forbidden = [
      "Active Seats",
      "Built for",
      "PRODUCTION HTTPS",
      "Approve Final Cut",
      "EDITOR WORKSPACE",
      "IN REVIEW",
      "UNLOCKED",
      "PIN #01",
    ];

    let allText = "";
    for (const f of [30, 190, 310]) {
      mockFrame = f;
      for (const Comp of [
        Act1Hook,
        Act2LiveProof,
        Act3PlayerAnnotate,
        Act4VersionCompare,
        Act5ShareApprove,
        Act6ArchitecturePricing,
        Act7Outro,
      ]) {
        const { container, unmount } = render(
          <Comp copy={viCopy} layout="portrait" durationInFrames={360} previewMode />,
        );
        allText += ` ${container.textContent ?? ""}`;
        unmount();
      }
    }

    for (const phrase of forbidden) {
      expect(allText).not.toContain(phrase);
    }
    expect(allText).toContain("VI_UNIQUE_ACT2_SUBLINE");
  });
});
