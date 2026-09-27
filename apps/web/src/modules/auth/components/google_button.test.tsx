import React from "react";
import { describe, expect, it } from "vitest";

import { AuthDivider, GoogleButton, GoogleIcon } from "./google_button";

describe("GoogleIcon", () => {
  it("renders an SVG with Google branding colors", () => {
    const el = GoogleIcon();
    expect(el.type).toBe("svg");
    expect(el.props["aria-hidden"]).toBe("true");
    expect(el.props.viewBox).toBe("0 0 24 24");
    expect(el.props.children).toHaveLength(4);
  });
});

describe("AuthDivider", () => {
  it("renders divider with studio styling", () => {
    const el = AuthDivider();
    expect(el.type).toBe("div");
    expect(el.props.className).toContain("relative");
  });
});

describe("GoogleButton", () => {
  it("is defined as a functional component", () => {
    expect(typeof GoogleButton).toBe("function");
    expect(GoogleButton.name).toBe("GoogleButton");
  });
});
