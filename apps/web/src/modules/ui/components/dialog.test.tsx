import { describe, expect, it, vi } from "vitest";

import {
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogSizeClasses,
  getDialogSizeClassName,
} from "./dialog";

describe("getDialogSizeClassName", () => {
  it("returns appropriate max-width classes for each size", () => {
    expect(getDialogSizeClassName("sm")).toBe("max-w-[400px]");
    expect(getDialogSizeClassName("md")).toBe("max-w-[480px]");
    expect(getDialogSizeClassName("lg")).toBe("max-w-[560px]");
    expect(getDialogSizeClassName("xl")).toBe("max-w-[680px]");
    expect(dialogSizeClasses.md).toBe("max-w-[480px]");
  });
});

describe("Dialog subcomponents", () => {
  it("renders DialogHeader container", () => {
    const header = DialogHeader({ children: "Header Content" });
    expect(header.type).toBe("div");
    expect(header.props.children).toBe("Header Content");
  });

  it("renders DialogEyebrow with uppercase tracking", () => {
    const eyebrow = DialogEyebrow({ children: "Organization Access" });
    expect(eyebrow.type).toBe("p");
    expect(eyebrow.props.className).toContain("uppercase");
    expect(eyebrow.props.children).toBe("Organization Access");
  });

  it("renders DialogTitle with font styles and id", () => {
    const title = DialogTitle({ id: "dialog-title", children: "Invite Member" });
    expect(title.type).toBe("h2");
    expect(title.props.id).toBe("dialog-title");
    expect(title.props.className).toContain("font-bold");
  });

  it("renders DialogDescription with text-muted and id", () => {
    const desc = DialogDescription({
      id: "dialog-desc",
      children: "Send an invitation link.",
    });
    expect(desc.type).toBe("p");
    expect(desc.props.id).toBe("dialog-desc");
    expect(desc.props.className).toContain("text-muted");
  });

  it("renders DialogCloseButton with accessible aria-label", () => {
    const closeFn = vi.fn();
    const btn = DialogCloseButton({
      onClick: closeFn,
      disabled: false,
    });
    expect(btn.type).toBe("button");
    expect(btn.props["aria-label"]).toBe("Close dialog");
    expect(btn.props.disabled).toBe(false);
  });

  it("renders DialogBody and DialogFooter layout containers", () => {
    const body = DialogBody({ children: "Body Elements" });
    expect(body.type).toBe("div");
    expect(body.props.className).toContain("mt-5");

    const footer = DialogFooter({ children: "Action Buttons" });
    expect(footer.type).toBe("div");
    expect(footer.props.className).toContain("justify-end");
  });
});
