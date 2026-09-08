import { describe, expect, it } from "vitest";
import {
  REVIEW_DECISION_CONFIGS,
  type ReviewStatus,
} from "./review_decision_dropdown";

describe("Review Decision Dropdown & Configs", () => {
  it("defines configs for all supported review statuses", () => {
    const statuses: ReviewStatus[] = [
      "approved",
      "needs_changes",
      "in_progress",
      "pending",
    ];

    statuses.forEach((status) => {
      const config = REVIEW_DECISION_CONFIGS[status];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.badgeVariant).toBeTruthy();
      expect(config.icon).toBeDefined();
    });
  });

  it("assigns appropriate badge styling variants for review states", () => {
    expect(REVIEW_DECISION_CONFIGS.approved.badgeVariant).toBe("success");
    expect(REVIEW_DECISION_CONFIGS.needs_changes.badgeVariant).toBe("danger");
    expect(REVIEW_DECISION_CONFIGS.in_progress.badgeVariant).toBe("outline");
    expect(REVIEW_DECISION_CONFIGS.pending.badgeVariant).toBe("surface");
  });
});
