import { describe, expect, it } from "vitest";

import { Card, CardBadge, CardDescription, CardFooter, CardHeader, CardTitle, getCardClassName } from "./card";

describe("getCardClassName", () => {
  it("generates default card classes", () => {
    const className = getCardClassName({});
    expect(className).toContain("rounded-xl");
    expect(className).toContain("border-line");
    expect(className).toContain("bg-surface");
    expect(className).not.toContain("hover:shadow-[5px_5px_0_#d8ff43]");
  });

  it("adds interactive hover classes when interactive is true", () => {
    const className = getCardClassName({ interactive: true });
    expect(className).toContain("hover:-translate-y-1");
    expect(className).toContain("hover:shadow-[5px_5px_0_#d8ff43]");
    expect(className).toContain("cursor-pointer");
  });

  it("handles disabled state styling", () => {
    const className = getCardClassName({ disabled: true });
    expect(className).toContain("bg-[#f0f0ea]");
    expect(className).toContain("opacity-65");
    expect(className).toContain("cursor-not-allowed");
    expect(className).not.toContain("hover:shadow-[5px_5px_0_#d8ff43]");
  });
});

describe("Card component", () => {
  it("renders a container element by default", () => {
    const el = Card({ children: "Content" });
    expect(el.type).toBe("div");
    expect(el.props.children).toBe("Content");
  });

  it("renders a Link with interactive styles when href is provided", () => {
    const el = Card({ href: "/projects/1", children: "Project" });
    expect(el.props.href).toBe("/projects/1");
    expect(el.props.className).toContain("hover:shadow-[5px_5px_0_#d8ff43]");
  });

  it("renders custom element when 'as' is specified", () => {
    const el = Card({ as: "article", children: "Article Content" });
    expect(el.type).toBe("article");
  });
});

describe("Card subcomponents", () => {
  it("renders CardHeader, CardBadge, CardTitle, CardDescription, CardFooter", () => {
    const header = CardHeader({ children: "Header" });
    expect(header.type).toBe("div");

    const badge = CardBadge({ children: "01" });
    expect(badge.props.className).toContain("bg-lime");

    const title = CardTitle({ children: "Card Title" });
    expect(title.type).toBe("h2");
    expect(title.props.className).toContain("text-xl");

    const desc = CardDescription({ children: "Card Description" });
    expect(desc.type).toBe("p");

    const footer = CardFooter({ children: "Footer Action" });
    expect(footer.type).toBe("footer");
    expect(footer.props.className).toContain("border-t");
  });
});
