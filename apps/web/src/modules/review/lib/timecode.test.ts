import { describe, expect, it } from "vitest";
import {
  formatSMPTETimecode,
  frameToSeconds,
  parseSMPTETimecode,
  secondsToFrame,
} from "./timecode";

describe("SMPTE Timecode Utilities", () => {
  it("formats 0 seconds correctly", () => {
    expect(formatSMPTETimecode(0, 24)).toBe("00:00:00:00");
  });

  it("formats seconds with frames at 24fps", () => {
    // 1 second + 12 frames at 24fps = 1.5s
    expect(formatSMPTETimecode(1.5, 24)).toBe("00:00:01:12");
    // 65.25s = 1 min, 5 secs, 6 frames at 24fps
    expect(formatSMPTETimecode(65.25, 24)).toBe("00:01:05:06");
  });

  it("formats seconds with frames at 30fps and 60fps", () => {
    expect(formatSMPTETimecode(10.5, 30)).toBe("00:00:10:15");
    expect(formatSMPTETimecode(10.5, 60)).toBe("00:00:10:30");
  });

  it("converts seconds to frames and vice versa", () => {
    expect(secondsToFrame(2.0, 25)).toBe(50);
    expect(frameToSeconds(50, 25)).toBe(2.0);
  });

  it("parses SMPTE timecode back to seconds", () => {
    const timecode = "00:01:05:12";
    const seconds = parseSMPTETimecode(timecode, 24);
    expect(seconds).toBe(65.5);
  });
});
