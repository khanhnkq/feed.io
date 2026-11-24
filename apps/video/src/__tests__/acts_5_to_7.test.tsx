import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

let mockFrame = 210;

vi.mock("remotion", async () => {
  const actual = await vi.importActual<typeof import("remotion")>("remotion");
  return {
    ...actual,
    useCurrentFrame: () => mockFrame,
    staticFile: (p: string) => `/${p}`,
    Img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
    useVideoConfig: () => ({
      fps: 60,
      width: 1920,
      height: 1080,
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

import { getCopy } from "../copy";
import { Act5ShareApprove } from "../scenes/Act5ShareApprove";
import { Act6ArchitecturePricing } from "../scenes/Act6ArchitecturePricing";
import { Act7Outro } from "../scenes/Act7Outro";

describe("Acts 5-7 scene choreography", () => {
  it.each(["landscape", "portrait"] as const)("renders Acts 5-7 with CTA domain in %s mode", (layout) => {
    const copy = getCopy("en");
    for (const f of [20, 210, 320]) {
      mockFrame = f;
      for (const Comp of [Act5ShareApprove, Act6ArchitecturePricing, Act7Outro]) {
        const { container, unmount } = render(
          <Comp copy={copy} layout={layout} durationInFrames={360} previewMode />,
        );
        expect(container.firstChild).not.toBeNull();
        unmount();
      }
    }
    mockFrame = 240;
    const outro = render(<Act7Outro copy={copy} layout={layout} durationInFrames={330} previewMode />);
    expect(outro.container.textContent).toContain("feedi.quizken.com");
  });
});
