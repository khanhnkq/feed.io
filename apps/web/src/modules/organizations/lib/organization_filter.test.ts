import type { OrganizationResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";

import {
  filterOrganizations,
  sortOrganizations,
} from "./organization_filter";

const mockOrgs: OrganizationResponse[] = [
  {
    id: "1",
    name: "Zeta Studio",
    slug: "zeta-studio-1111",
  },
  {
    id: "2",
    name: "Alpha Corp",
    slug: "alpha-corp-2222",
  },
  {
    id: "3",
    name: "Beta Productions",
    slug: "beta-prod-3333",
  },
];

describe("organization_filter", () => {
  it("returns all organizations when search query is empty", () => {
    expect(filterOrganizations(mockOrgs, "")).toEqual(mockOrgs);
    expect(filterOrganizations(mockOrgs, "   ")).toEqual(mockOrgs);
  });

  it("filters organizations by name case-insensitively", () => {
    const result = filterOrganizations(mockOrgs, "alpha");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Alpha Corp");
  });

  it("filters organizations by slug", () => {
    const result = filterOrganizations(mockOrgs, "beta-prod");
    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe("beta-prod-3333");
  });

  it("sorts organizations by name ascending (A-Z)", () => {
    const result = sortOrganizations(mockOrgs, "name_asc");
    expect(result.map((o) => o.name)).toEqual([
      "Alpha Corp",
      "Beta Productions",
      "Zeta Studio",
    ]);
  });

  it("sorts organizations by name descending (Z-A)", () => {
    const result = sortOrganizations(mockOrgs, "name_desc");
    expect(result.map((o) => o.name)).toEqual([
      "Zeta Studio",
      "Beta Productions",
      "Alpha Corp",
    ]);
  });
});
