import { describe, expect, it } from "vitest";
import {
  DropdownHeader,
  DropdownSeparator,
  dropdownSizeClasses,
  dropdownVariantClasses,
  getDropdownTriggerClassName,
} from "./dropdown";

describe("dropdownSizeClasses", () => {
  it("matches Button size classes for heights", () => {
    expect(dropdownSizeClasses.sm).toContain("min-h-9 h-9");
    expect(dropdownSizeClasses.md).toContain("min-h-11 h-11");
    expect(dropdownSizeClasses.lg).toContain("min-h-12 h-12");
  });
});

describe("dropdownVariantClasses", () => {
  it("defines standard variants", () => {
    expect(dropdownVariantClasses.outline).toContain("border-line");
    expect(dropdownVariantClasses.lime).toContain("bg-lime");
    expect(dropdownVariantClasses["dark-outline"]).toContain("bg-[#1c1e18]");
  });
});

describe("getDropdownTriggerClassName", () => {
  it("generates trigger class with correct size and variant matching button", () => {
    const smClass = getDropdownTriggerClassName({ size: "sm", variant: "outline" });
    expect(smClass).toContain("min-h-9 h-9");
    expect(smClass).toContain("px-3");
    expect(smClass).toContain("text-xs");
    expect(smClass).toContain("rounded-lg");
    expect(smClass).toContain("border-line");

    const mdClass = getDropdownTriggerClassName({ size: "md", variant: "lime" });
    expect(mdClass).toContain("min-h-11 h-11");
    expect(mdClass).toContain("bg-lime");

    const lgClass = getDropdownTriggerClassName({ size: "lg" });
    expect(lgClass).toContain("min-h-12 h-12");
  });

  it("handles isOpen state to add border-ink", () => {
    const openClass = getDropdownTriggerClassName({ isOpen: true });
    expect(openClass).toContain("border-ink");
  });
});

describe("Dropdown subcomponents", () => {
  it("renders DropdownHeader with uppercase styling", () => {
    const header = DropdownHeader({ children: "Options" });
    expect(header.type).toBe("div");
    expect(header.props.children).toBe("Options");
    expect(header.props.className).toContain("uppercase");
  });

  it("renders DropdownSeparator with separator role and border styling", () => {
    const separator = DropdownSeparator({});
    expect(separator.type).toBe("div");
    expect(separator.props.role).toBe("separator");
    expect(separator.props.className).toContain("border-t");
  });
});
