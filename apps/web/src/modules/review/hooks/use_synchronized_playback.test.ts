import { describe, expect, it } from "vitest";
import {
  calculateClampedSeek,
  calculateDrift,
  calculateStepTime,
  calculateSynchronizedTargetTime,
  isDriftCorrectionNeeded,
} from "./use_synchronized_playback";

describe("Synchronized Playback Calculations", () => {
  describe("calculateSynchronizedTargetTime", () => {
    it("returns identical time when frame offset is zero", () => {
      expect(calculateSynchronizedTargetTime(10.5, 0, 24)).toBe(10.5);
      expect(calculateSynchronizedTargetTime(0, 0, 30)).toBe(0);
    });

    it("advances target time according to positive frame offset", () => {
      // 24 frames at 24fps = 1.0s offset
      expect(calculateSynchronizedTargetTime(5.0, 24, 24)).toBe(6.0);
      // 15 frames at 30fps = 0.5s offset
      expect(calculateSynchronizedTargetTime(10.0, 15, 30)).toBe(10.5);
    });

    it("retards target time with negative frame offset and clamps to 0", () => {
      // 48 frames at 24fps = 2.0s retard
      expect(calculateSynchronizedTargetTime(5.0, -48, 24)).toBe(3.0);
      // Retarding past zero clamps at 0.0
      expect(calculateSynchronizedTargetTime(1.0, -48, 24)).toBe(0);
    });
  });

  describe("calculateDrift and isDriftCorrectionNeeded", () => {
    it("computes absolute drift between follower video and target", () => {
      expect(calculateDrift(10.05, 10.0)).toBeCloseTo(0.05);
      expect(calculateDrift(9.95, 10.0)).toBeCloseTo(0.05);
      expect(calculateDrift(10.0, 10.0)).toBe(0);
    });

    it("flags drift correction when drift exceeds 1 frame threshold", () => {
      const fps = 24;
      const oneFrame = 1 / fps; // ~0.04166s

      // Within threshold: no correction needed
      expect(isDriftCorrectionNeeded(0.02, fps)).toBe(false);
      expect(isDriftCorrectionNeeded(oneFrame, fps)).toBe(false);

      // Exceeds 1 frame threshold: correction required
      expect(isDriftCorrectionNeeded(0.05, fps)).toBe(true);
      expect(isDriftCorrectionNeeded(0.1, fps)).toBe(true);
    });
  });

  describe("calculateClampedSeek", () => {
    it("clamps seek time within [0, totalDuration]", () => {
      const totalDuration = 120;

      expect(calculateClampedSeek(45.2, totalDuration)).toBe(45.2);
      expect(calculateClampedSeek(-5.0, totalDuration)).toBe(0);
      expect(calculateClampedSeek(150.0, totalDuration)).toBe(120);
    });

    it("handles default fallback duration when totalDuration is zero", () => {
      expect(calculateClampedSeek(50.0, 0)).toBe(50.0);
      expect(calculateClampedSeek(-1.0, 0)).toBe(0);
    });
  });

  describe("calculateStepTime", () => {
    it("steps forward and backward by exact frame durations", () => {
      const fps = 24;
      const totalDuration = 100;

      // Forward 1 frame
      const nextFrame = calculateStepTime(10.0, 1, fps, totalDuration);
      expect(nextFrame).toBeCloseTo(10.0 + 1 / 24);

      // Backward 1 frame
      const prevFrame = calculateStepTime(10.0, -1, fps, totalDuration);
      expect(prevFrame).toBeCloseTo(10.0 - 1 / 24);

      // Clamps to 0 when stepping back at beginning
      expect(calculateStepTime(0.01, -1, fps, totalDuration)).toBe(0);

      // Clamps to total duration when stepping forward at end
      expect(calculateStepTime(100.0, 5, fps, totalDuration)).toBe(100);
    });
  });
});
