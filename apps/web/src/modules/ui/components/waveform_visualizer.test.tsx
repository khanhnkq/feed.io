import { describe, expect, it } from "vitest";
import { normalizePeaks } from "./waveform_visualizer";

describe("WaveformVisualizer Utilities", () => {
  it("normalizes provided peaks", () => {
    const peaks = [0.2, 0.5, 0.8];
    expect(normalizePeaks(peaks)).toEqual([0.2, 0.5, 0.8]);
  });

  it("generates fallback harmonic peaks when empty array is provided", () => {
    const fallback = normalizePeaks([]);
    expect(fallback).toHaveLength(100);
    expect(fallback[0]).toBeGreaterThan(0);
  });
});
