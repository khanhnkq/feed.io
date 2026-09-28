import { describe, expect, it } from "vitest";
import { getBillingQueryKey, PLATFORM_SETTINGS_QUERY_KEY } from "./hooks/use_billing";
import { STORAGE_TIERS } from "@/modules/landing/components/pricing_calculator";
import { BillingScreen } from "./components/billing_screen";
import { UpgradeModal } from "./components/upgrade_modal";

describe("Billing Module - Domain Constants & Keys", () => {
  it("formats billing query key properly", () => {
    const key = getBillingQueryKey("org-12345");
    expect(key).toEqual(["organizations", "org-12345", "billing"]);
  });

  it("formats platform settings query key properly", () => {
    expect(PLATFORM_SETTINGS_QUERY_KEY).toEqual(["admin", "platform-settings"]);
  });

  it("verifies STORAGE_TIERS structure adhering to FreeFrame benchmark", () => {
    expect(STORAGE_TIERS.length).toBe(3);

    const [t100, t500, t1tb] = STORAGE_TIERS;

    // 100 GB tier
    expect(t100.id).toBe("pro_100gb");
    expect(t100.storageLabel).toBe("100 GB");
    expect(t100.monthlyPrice).toBe(5);
    expect(t100.yearlyTotalPrice).toBe(50);

    // 500 GB tier
    expect(t500.id).toBe("pro_500gb");
    expect(t500.storageLabel).toBe("500 GB");
    expect(t500.monthlyPrice).toBe(15);
    expect(t500.yearlyTotalPrice).toBe(150);
    expect(t500.isPopular).toBe(true);

    // 1 TB tier
    expect(t1tb.id).toBe("pro_1tb");
    expect(t1tb.storageLabel).toBe("1 TB");
    expect(t1tb.monthlyPrice).toBe(27);
    expect(t1tb.yearlyTotalPrice).toBe(270);
  });
});

describe("BillingScreen Component", () => {
  it("exports valid BillingScreen component function", () => {
    expect(typeof BillingScreen).toBe("function");
  });
});

describe("UpgradeModal Component", () => {
  it("exports valid UpgradeModal component function", () => {
    expect(typeof UpgradeModal).toBe("function");
  });
});
