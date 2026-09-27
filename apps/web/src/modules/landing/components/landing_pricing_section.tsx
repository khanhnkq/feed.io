"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";

import { gsap, useGSAP } from "../lib/gsap_init";
import { PricingCalculator } from "./pricing_calculator";

export function LandingPricingSection() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isMotionAllowed: "(prefers-reduced-motion: no-preference)",
          isReducedMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isMotionAllowed } = context.conditions as {
            isMotionAllowed: boolean;
            isReducedMotion: boolean;
          };

          if (isMotionAllowed && containerRef.current) {
            gsap.fromTo(
              ".pricing-header",
              { y: 25, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.6,
                scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 90%",
                  once: true,
                },
              }
            );

            gsap.fromTo(
              ".pricing-card",
              { y: 35, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                stagger: 0.12,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 85%",
                  once: true,
                },
              }
            );
          } else {
            gsap.set([".pricing-header", ".pricing-card"], { autoAlpha: 1, y: 0 });
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="pricing"
      className="border-t border-line bg-paper py-20 md:py-32 relative"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Section Header */}
        <div className="pricing-header mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted shadow-sm">
            <Sparkles size={13} className="text-focus" />
            <span>STORAGE-TIERED PRICING</span>
          </div>

          <h2 className="mt-4 text-[clamp(34px,4.5vw,56px)] font-black tracking-tight text-ink leading-[1.05]">
            No per-seat pricing. Ever.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#52564d] font-medium leading-relaxed max-w-2xl mx-auto">
            Everyone else bills you by the head. We charge for storage, so a ten-person team pays{" "}
            <span className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">
              $5/month
            </span>{" "}
            and so does a fifty-person one.
          </p>

          <p className="mt-3 text-xs text-muted max-w-xl mx-auto">
            Feedi is engineered for creative freedom: reviewers, clients, and freelancers never cost a seat.
          </p>
        </div>

        {/* Interactive Pricing Calculator & Tier Cards */}
        <div className="mt-14">
          <PricingCalculator />
        </div>
      </div>
    </section>
  );
}
