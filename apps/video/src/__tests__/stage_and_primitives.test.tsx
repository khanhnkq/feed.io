import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("remotion", async () => {
  const actual = await vi.importActual<typeof import("remotion")>("remotion");
  return {
    ...actual,
    useCurrentFrame: () => 45,
    useVideoConfig: () => ({
      fps: 60,
      width: 1920,
      height: 1080,
      durationInFrames: 360,
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

import { AnimatedCursor } from "../components/AnimatedCursor";
import { BrowserFrame } from "../components/BrowserFrame";
import { CameraRig3D } from "../components/CameraRig3D";
import { KeycapHud } from "../components/KeycapHud";
import { KineticTitle } from "../components/KineticTitle";
import { getStageBounds, getStagePaddingStyle } from "../layout/stage";

describe("stage geometry & After Effects motion primitives", () => {
  it("keeps portrait safe bounds clear of TikTok/Shorts top & bottom UI chrome", () => {
    const b = getStageBounds("portrait");
    expect(b.width).toBe(1080);
    expect(b.height).toBe(1920);
    expect(b.isPortrait).toBe(true);
    expect(b.safeTop).toBeGreaterThanOrEqual(140);
    expect(b.safeBottom).toBeLessThanOrEqual(1700);
    expect(b.paddingX).toBeGreaterThanOrEqual(56);

    const pad = getStagePaddingStyle("portrait");
    expect(pad.paddingTop).toBe(156);
    expect(pad.paddingBottom).toBe(240);

    const l = getStageBounds("landscape");
    expect([l.width, l.height, l.isPortrait]).toEqual([1920, 1080, false]);
  });

  it("renders CameraRig3D, KineticTitle, BrowserFrame, AnimatedCursor & KeycapHud cleanly", () => {
    const { container } = render(
      <CameraRig3D
        layout="landscape"
        keyframes={[
          { frame: 0, rotateX: 12, rotateY: -10, scale: 0.92 },
          { frame: 60, rotateX: 0, rotateY: 0, scale: 1 },
        ]}
      >
        <KineticTitle
          lines={["FRAME-ACCURATE REVIEW", "SUPER_LONG_VIETNAMESE_LOCALIZATION_STRESS_TEST_HEADLINE"]}
          accentIndex={0}
        />
        <BrowserFrame url="https://feedi.quizken.com" badge="LIVE">
          <div>Viewport</div>
        </BrowserFrame>
        <KeycapHud
          label="NLE KEYS"
          keys={[
            { label: "J", activeAt: 10 },
            { label: "K", activeAt: 40 },
            { label: "L", activeAt: 70 },
          ]}
        />
        <AnimatedCursor
          waypoints={[
            { frame: 0, x: 200, y: 300 },
            { frame: 45, x: 640, y: 420, click: true },
          ]}
        />
      </CameraRig3D>,
    );
    expect(container.textContent).toContain("https://feedi.quizken.com");
    expect(container.textContent).toContain("FRAME-ACCURATE REVIEW");
    expect(container.textContent).toContain("NLE KEYS");
  });
});
