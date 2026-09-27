"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/modules/ui";

export interface StorageTier {
  id: string;
  storageLabel: string;
  storageBytes: number;
  monthlyPrice: number;
  yearlyMonthlyEquivalent: number;
  yearlyTotalPrice: number;
  isPopular?: boolean;
}

export const STORAGE_TIERS: StorageTier[] = [
  {
    id: "pro_100gb",
    storageLabel: "100 GB",
    storageBytes: 100 * 1024 * 1024 * 1024,
    monthlyPrice: 5,
    yearlyMonthlyEquivalent: 4.15,
    yearlyTotalPrice: 50,
  },
  {
    id: "pro_500gb",
    storageLabel: "500 GB",
    storageBytes: 500 * 1024 * 1024 * 1024,
    monthlyPrice: 15,
    yearlyMonthlyEquivalent: 12.5,
    yearlyTotalPrice: 150,
    isPopular: true,
  },
  {
    id: "pro_1tb",
    storageLabel: "1 TB",
    storageBytes: 1024 * 1024 * 1024 * 1024,
    monthlyPrice: 27,
    yearlyMonthlyEquivalent: 22.5,
    yearlyTotalPrice: 270,
  },
];

interface PricingCalculatorProps {
  showEnterpriseFooter?: boolean;
  className?: string;
}

export function PricingCalculator({
  showEnterpriseFooter = true,
  className = "",
}: PricingCalculatorProps) {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [tierIndex, setTierIndex] = useState<number>(0);

  const currentTier = STORAGE_TIERS[tierIndex] || STORAGE_TIERS[0];
  const isYearly = billingInterval === "yearly";

  const displayPrice = isYearly
    ? currentTier.yearlyMonthlyEquivalent % 1 === 0
      ? currentTier.yearlyMonthlyEquivalent
      : currentTier.yearlyMonthlyEquivalent.toFixed(2)
    : currentTier.monthlyPrice;

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Monthly / Yearly Billing Toggle */}
      <div className="mb-10 flex flex-col items-center justify-center gap-3">
        <div
          role="group"
          aria-label="Billing cycle"
          className="inline-flex items-center rounded-full border border-line bg-surface p-1 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            aria-pressed={!isYearly}
            className={`cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              !isYearly
                ? "bg-ink text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            aria-pressed={isYearly}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              isYearly
                ? "bg-ink text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <span>Yearly</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide transition ${
                isYearly ? "bg-lime text-ink" : "bg-lime/30 text-ink"
              }`}
            >
              · Save 17%
            </span>
          </button>
        </div>

        {isYearly && (
          <p className="font-mono text-xs font-semibold text-focus animate-in fade-in duration-200">
            ✓ Billed annually (~2 months free) · Cancel anytime
          </p>
        )}
      </div>

      {/* 2. Side-by-Side Cards (Free vs Hosted Slider) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr] items-stretch">
        {/* Card 1: Free Tier */}
        <div className="pricing-card relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 shadow-sm transition hover:border-ink hover:shadow-[5px_5px_0_#d8ff43]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-ink">Free</h3>
              <span className="rounded bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted border border-line">
                STARTER
              </span>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              Everything you need to review cuts, for a team of up to five.
            </p>

            <div className="mt-6">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-ink">
                  $0
                </span>
                <span className="text-xs text-muted font-medium">/ forever</span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">
                5 GB storage · no credit card required
              </p>
            </div>

            <div className="mt-6">
              <Button href="/register" size="md" variant="outline" fullWidth>
                Start free
              </Button>
            </div>

            <div className="my-8 border-t border-line" />

            <ul className="space-y-3 text-xs sm:text-sm text-ink">
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>
                  <strong>Up to 5 members</strong> in your workspace
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Video, audio & image frame-accurate review</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Timestamped comments & canvas drawings</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Share links with passphrase protection</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Approval workflows & client sign-offs</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-lime mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Unlimited projects & video version stacking</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-dashed border-line">
            <span className="text-[11px] text-muted block text-center">
              Self-host free forever with Docker, or upgrade anytime for more room.
            </span>
          </div>
        </div>

        {/* Card 2: Hosted / Pro Tier with Interactive Slider */}
        <div className="pricing-card relative flex flex-col justify-between rounded-2xl border-2 border-ink bg-[#141512] p-8 text-white shadow-2xl hover:shadow-[7px_7px_0_#d8ff43] transition">
          {/* Top Floating Badge */}
          <span className="absolute -top-3.5 left-8 inline-flex items-center gap-1.5 rounded-full bg-lime px-3.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-ink shadow-sm">
            <Sparkles size={11} />
            UNLIMITED MEMBERS ON EVERY TIER
          </span>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white">Hosted Pro</h3>
                <p className="mt-1 text-xs sm:text-sm text-[#a0a398]">
                  We run the infrastructure. More room, unlimited people, every premium feature.
                </p>
              </div>
            </div>

            {/* Slider Controls Box */}
            <div className="mt-6 rounded-xl border border-[#2e3028] bg-[#1a1c17] p-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="storage-range"
                  className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#a9ad9f]"
                >
                  How much room?
                </label>
                <span className="rounded bg-lime/20 border border-lime/40 px-2 py-0.5 font-mono text-[11px] font-extrabold text-lime">
                  {currentTier.storageLabel}
                </span>
              </div>

              {/* Price Callout */}
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-3xl sm:text-4xl font-black text-white">
                  {currentTier.storageLabel}
                </span>

                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-lime">
                      ${displayPrice}
                    </span>
                    <span className="font-sans text-xs text-[#a0a398]">
                      USD / month
                    </span>
                  </div>
                  {isYearly && (
                    <span className="font-mono text-[11px] text-[#73766d] block">
                      ${currentTier.yearlyTotalPrice} billed annually
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive Range Input */}
              <div className="mt-4">
                <input
                  id="storage-range"
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={tierIndex}
                  onChange={(e) => setTierIndex(Number(e.target.value))}
                  aria-valuetext={currentTier.storageLabel}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#2e3028] accent-lime focus:outline-none"
                />

                {/* Slider Ticks Legend */}
                <div className="mt-2.5 flex justify-between font-mono text-xs font-semibold text-[#8e9185]">
                  {STORAGE_TIERS.map((tier, idx) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setTierIndex(idx)}
                      className={`cursor-pointer transition hover:text-white ${
                        tierIndex === idx
                          ? "text-lime font-black underline underline-offset-4 decoration-2"
                          : ""
                      }`}
                    >
                      {tier.storageLabel}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-center font-mono text-[11px] text-[#8e9185]">
                {isYearly
                  ? `Billed annually ($${currentTier.yearlyTotalPrice}/yr) · Cancel anytime`
                  : "Billed monthly · Cancel anytime"}
              </p>
            </div>

            {/* Dynamic CTA Button */}
            <div className="mt-5">
              <Button
                href={`/register?plan=${currentTier.id}&interval=${billingInterval}`}
                size="lg"
                variant="lime"
                fullWidth
              >
                Get {currentTier.storageLabel} &rarr;
              </Button>
              <p className="mt-2 text-center font-mono text-[10px] text-[#73766d]">
                Instant activation · No per-seat penalties · Full data portability
              </p>
            </div>

            <div className="my-7 border-t border-[#2e3028]" />

            {/* Feature List */}
            <ul className="space-y-3.5 text-xs sm:text-sm text-[#e0e2d8]">
              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>
                  <strong>{currentTier.storageLabel} high-speed S3 storage</strong> (accelerated proxy & HLS streaming)
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>
                  <strong className="text-lime">Unlimited members:</strong> reviewers, directors, and clients never cost a seat
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>
                  <strong>NLE comment export:</strong> Final Cut Pro XML, DaVinci Resolve & Premiere marker CSV
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>
                  <strong>Side-by-side version compare:</strong> synchronized playback split-screen & difference blend
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Custom project statuses & studio workflow stages</span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-lime text-ink mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Social preview custom branding & review link watermarking</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Bottom FreeFrame Footnotes */}
      {showEnterpriseFooter && (
        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-muted">
            Need more than 1 TB of studio storage?{" "}
            <Link
              href="mailto:contact@feedi.local?subject=Feedi%20Enterprise%20Storage%20Inquiry"
              className="font-bold text-ink underline underline-offset-4 hover:decoration-lime"
            >
              Talk to us &rarr;
            </Link>
          </p>

          <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-muted font-mono">
            Free workspaces are capped at five members. Every paid plan has unlimited members:
            reviewers, clients, and freelancers never count against a seat. Prices in USD, excluding applicable tax.
          </p>
        </div>
      )}
    </div>
  );
}
