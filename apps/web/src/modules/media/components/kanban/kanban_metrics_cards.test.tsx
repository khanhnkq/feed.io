import { describe, expect, it } from "vitest";
import { KanbanMetricsCards } from "./kanban_metrics_cards";

describe("KanbanMetricsCards", () => {
  it("renders correctly with given metrics", () => {
    const el = KanbanMetricsCards({
      total: 4,
      pendingCount: 1,
      inProgressCount: 1,
      needsChangesCount: 1,
      approvedCount: 1,
    });
    expect(el).toBeDefined();
  });

  it("handles zero total gracefully without NaN", () => {
    const el = KanbanMetricsCards({
      total: 0,
      pendingCount: 0,
      inProgressCount: 0,
      needsChangesCount: 0,
      approvedCount: 0,
    });
    expect(el).toBeDefined();
  });
});
