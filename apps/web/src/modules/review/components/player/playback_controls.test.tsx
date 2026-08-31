import { describe, expect, it, vi } from "vitest";
import { formatSMPTETimecode } from "../../lib/timecode";
import { PlaybackControls } from "./playback_controls";

describe("PlaybackControls Component", () => {
  it("computes formatted SMPTE timecodes accurately", () => {
    expect(formatSMPTETimecode(65.5, 24)).toBe("00:01:05:12");
    expect(formatSMPTETimecode(120, 24)).toBe("00:02:00:00");
  });

  it("constructs playback controls JSX element with correct props", () => {
    const el = PlaybackControls({
      isPlaying: false,
      onTogglePlay: vi.fn(),
      onStepFrame: vi.fn(),
      onJumpSeconds: vi.fn(),
      currentTime: 65.5,
      duration: 120,
      fps: 24,
      playbackRate: 1,
      onChangePlaybackRate: vi.fn(),
      isLooping: false,
      onToggleLoop: vi.fn(),
      volume: 1,
      isMuted: false,
      onChangeVolume: vi.fn(),
      onToggleMute: vi.fn(),
      isFullscreen: false,
      onToggleFullscreen: vi.fn(),
    });

    expect(el).toBeDefined();
    expect(el.props.className).toContain("flex flex-wrap items-center");
  });
});
