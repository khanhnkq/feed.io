import { describe, expect, it } from "vitest";

import { PricingCalculator, STORAGE_TIERS } from "./pricing_calculator";

describe("STORAGE_TIERS", () => {
  it("defines the 3 discrete FreeFrame storage tiers", () => {
    expect(STORAGE_TIERS).toHaveLength(3);

    // Tier 1: 100 GB
    expect(STORAGE_TIERS[0].id).toBe("pro_100gb");
    expect(STORAGE_TIERS[0].storageLabel).toBe("100 GB");
    expect(STORAGE_TIERS[0].storageBytes).toBe(100 * 1024 * 1024 * 1024);
    expect(STORAGE_TIERS[0].monthlyPrice).toBe(5);
    expect(STORAGE_TIERS[0].yearlyTotalPrice).toBe(50);
    expect(STORAGE_TIERS[0].yearlyMonthlyEquivalent).toBe(4.15);

    // Tier 2: 500 GB
    expect(STORAGE_TIERS[1].id).toBe("pro_500gb");
    expect(STORAGE_TIERS[1].storageLabel).toBe("500 GB");
    expect(STORAGE_TIERS[1].storageBytes).toBe(500 * 1024 * 1024 * 1024);
    expect(STORAGE_TIERS[1].monthlyPrice).toBe(15);
    expect(STORAGE_TIERS[1].yearlyTotalPrice).toBe(150);
    expect(STORAGE_TIERS[1].yearlyMonthlyEquivalent).toBe(12.5);

    // Tier 3: 1 TB
    expect(STORAGE_TIERS[2].id).toBe("pro_1tb");
    expect(STORAGE_TIERS[2].storageLabel).toBe("1 TB");
    expect(STORAGE_TIERS[2].storageBytes).toBe(1024 * 1024 * 1024 * 1024);
    expect(STORAGE_TIERS[2].monthlyPrice).toBe(27);
    expect(STORAGE_TIERS[2].yearlyTotalPrice).toBe(270);
    expect(STORAGE_TIERS[2].yearlyMonthlyEquivalent).toBe(22.5);
  });

  it("calculates 17% savings for annual billing on all tiers", () => {
    STORAGE_TIERS.forEach((tier) => {
      const fullAnnualAtMonthlyRate = tier.monthlyPrice * 12;
      const savings = fullAnnualAtMonthlyRate - tier.yearlyTotalPrice;
      const discountPercentage = (savings / fullAnnualAtMonthlyRate) * 100;
      // Discount is ~16.67% rounded to 17%
      expect(Math.round(discountPercentage)).toBe(17);
    });
  });
});

describe("PricingCalculator Component", () => {
  it("is defined as a functional component", () => {
    expect(typeof PricingCalculator).toBe("function");
    expect(PricingCalculator.name).toBe("PricingCalculator");
  });
});
