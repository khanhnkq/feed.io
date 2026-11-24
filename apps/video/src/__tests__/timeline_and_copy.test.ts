import { describe, expect, it } from "vitest";
import { getCopy } from "../copy";
import { VideoCopySchema } from "../copy/types";
import { formatSmpte, getTimelineSchedule } from "../timeline/schedule";
import { SPRINGS, TOKENS } from "../theme/tokens";

describe("timeline & copy contracts", () => {
  it("partitions 16:9 (3960f) and 9:16 (2640f) contiguously on 30f beat grid", () => {
    for (const [mode, total, dims] of [
      ["landscape", 3960, [1920, 1080]],
      ["portrait", 2640, [1080, 1920]],
    ] as const) {
      const s = getTimelineSchedule(mode);
      expect(s.fps).toBe(60);
      expect(s.bpm).toBe(120);
      expect([s.width, s.height]).toEqual(dims);
      expect(s.totalFrames).toBe(total);
      let cursor = 0;
      for (const id of ["act1", "act2", "act3", "act4", "act5", "act6", "act7"] as const) {
        expect(s.acts[id].start).toBe(cursor);
        expect(s.acts[id].duration % 30).toBe(0);
        cursor += s.acts[id].duration;
      }
      expect(cursor).toBe(total);
      expect(s.sfxCues.length).toBeGreaterThan(15);
      expect(s.sfxCues.every((c) => Number.isInteger(c.frame) && c.frame >= 0 && c.frame < total)).toBe(true);
    }
  });

  it("validates English copy against VideoCopySchema and formats 24fps SMPTE", () => {
    const copy = getCopy("en");
    expect(() => VideoCopySchema.parse(copy)).not.toThrow();
    expect(copy.act1.brandReveal).toBe("MEET FEEDI.");
    expect(copy.act7.domain).toBe("feedi.quizken.com");
    expect(formatSmpte(114, 24)).toBe("00:00:04:18");
    expect(formatSmpte(0, 24)).toBe("00:00:00:00");
    expect(TOKENS.colors.lime).toBe("#d8ff43");
    expect(TOKENS.colors.ink).toBe("#11130f");
    expect(SPRINGS.snappy.damping).toBeGreaterThan(0);
  });
});
