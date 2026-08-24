import { describe, expect, it } from "vitest";

import { Button, getButtonClassName } from "./button";

describe("getButtonClassName", () => {
  it("generates default primary classes with shadow-none and hover shadow", () => {
    const className = getButtonClassName({});
    expect(className).toContain("bg-ink");
    expect(className).toContain("shadow-none");
    expect(className).toContain("hover:shadow-[5px_5px_0_#d8ff43]");
    expect(className).toContain("hover:-translate-y-1");
  });

  it("handles outline variant correctly", () => {
    const className = getButtonClassName({ variant: "outline" });
    expect(className).toContain("bg-surface");
    expect(className).toContain("border-line");
    expect(className).toContain("hover:border-ink");
  });

  it("handles lime and dark-outline variants correctly", () => {
    const limeClass = getButtonClassName({ variant: "lime" });
    expect(limeClass).toContain("bg-lime");
    expect(limeClass).toContain("text-ink");

    const darkOutlineClass = getButtonClassName({ variant: "dark-outline" });
    expect(darkOutlineClass).toContain("bg-[#1c1e18]");
    expect(darkOutlineClass).toContain("text-white");
  });

  it("handles size variants correctly", () => {
    const smClass = getButtonClassName({ size: "sm" });
    const lgClass = getButtonClassName({ size: "lg" });
    expect(smClass).toContain("min-h-9");
    expect(lgClass).toContain("min-h-12");
  });

  it("handles fullWidth option", () => {
    const fullClass = getButtonClassName({ fullWidth: true });
    expect(fullClass).toContain("w-full");
  });
});

describe("Button component", () => {
  it("renders a button element structure", () => {
    const el = Button({ children: "Save" });
    expect(el.type).toBe("button");
    expect(el.props.children).toBe("Save");
  });

  it("renders a link element when href is provided", () => {
    const el = Button({ href: "/app", children: "Dashboard" });
    expect(el.props.href).toBe("/app");
  });

  it("renders pending fallback text when pending is true", () => {
    const el = Button({ pending: true, children: "Submit" });
    expect(el.props.children).toBe("Working…");
    expect(el.props.disabled).toBe(true);
  });
});
