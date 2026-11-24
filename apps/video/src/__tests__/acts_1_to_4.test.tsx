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
    OffthreadVideo: (props: { src: string }) => <div data-testid="video-stub" data-src={props.src} />,
    useVideoConfig: () => ({
      fps: 60,
      width: 1920,
      height: 1080,
      durationInFrames: 480,
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

import { getCopy } from "../copy";
import { Act1Hook } from "../scenes/Act1Hook";
import { Act2LiveProof } from "../scenes/Act2LiveProof";
import { Act3PlayerAnnotate } from "../scenes/Act3PlayerAnnotate";
import { Act4VersionCompare } from "../scenes/Act4VersionCompare";

describe("Acts 1-4 scene choreography", () => {
  it.each(["landscape", "portrait"] as const)("renders Acts 1-4 cleanly across early & late frames in %s mode", (layout) => {
    const copy = getCopy("en");
    for (const f of [10, 180, 330]) {
      mockFrame = f;
      for (const Comp of [Act1Hook, Act2LiveProof, Act3PlayerAnnotate, Act4VersionCompare]) {
        const { container, unmount } = render(
          <Comp copy={copy} layout={layout} durationInFrames={360} previewMode />,
        );
        expect(container.textContent?.length).toBeGreaterThan(10);
        unmount();
      }
    }
  });
});
