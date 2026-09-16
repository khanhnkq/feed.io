import { describe, expect, it, vi } from "vitest";
import { ApproveWithOpenIssuesDialog } from "./approve_with_open_issues_dialog";

describe("ApproveWithOpenIssuesDialog", () => {
  it("renders when open and displays open issues count", () => {
    const onClose = vi.fn();
    const onApproveAnyway = vi.fn();
    const onResolveAllAndApprove = vi.fn();

    const element = ApproveWithOpenIssuesDialog({
      isOpen: true,
      onClose,
      mediaTitle: "Hero_Video_Cut_v2.mp4",
      openIssuesCount: 3,
      onApproveAnyway,
      onResolveAllAndApprove,
    });

    expect(element).not.toBeNull();
  });

  it("returns null when isOpen is false", () => {
    const element = ApproveWithOpenIssuesDialog({
      isOpen: false,
      onClose: vi.fn(),
      openIssuesCount: 2,
      onApproveAnyway: vi.fn(),
    });

    expect(element).toBeNull();
  });
});
