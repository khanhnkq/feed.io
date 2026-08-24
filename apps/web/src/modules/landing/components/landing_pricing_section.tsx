"use client";

import { useRef } from "react";
import { Check } from "lucide-react";

import { Button } from "@/modules/ui";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingPricingSection() {
  const containerRef = useRef<HTMLElement>(null);

  const plans = [
    {
      name: "Community Self-Hosted",
      badge: "OPEN SOURCE",
      price: "$0",
      period: "forever",
      desc: "Deploy on your own servers with Docker. Complete data privacy and unlimited local storage.",
      features: [
        "Full S3 / Garage Storage Integration",
        "Frame-Accurate Video Player",
        "Unlimited Guest Review Links",
        "Canvas Annotations & Drawing",
        "Community Support",
      ],
      buttonText: "Deploy Self-Hosted",
      buttonVariant: "outline" as const,
      isFeatured: false,
    },
    {
      name: "Studio Cloud",
      badge: "MOST POPULAR",
      price: "$29",
      period: "/ seat / month",
      desc: "Fully managed high-speed video collaboration with automatic proxy transcoding and edge HLS.",
      features: [
        "Everything in Community",
        "High-Speed 4K Proxy Transcoding",
        "Multi-Organization & RBAC Roles",
        "Custom Branding & Review Link Watermarking",
        "Priority Email & Slack Support",
      ],
      buttonText: "Start 14-Day Free Trial",
      buttonVariant: "lime" as const,
      isFeatured: true,
    },
    {
      name: "Enterprise",
      badge: "SCALE",
      price: "Custom",
      period: "",
      desc: "For production houses, broadcast networks, and global agency networks with custom SLA needs.",
      features: [
        "Dedicated Kubernetes / Bare-Metal Deployments",
        "SAML 2.0 / Okta SSO Integration",
        "Custom Retention & Audit Logs",
        "99.99% Uptime SLA",
        "Dedicated Success Manager",
      ],
      buttonText: "Contact Enterprise",
      buttonVariant: "outline" as const,
      isFeatured: false,
    },
  ];

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
        <div className="pricing-header mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(32px,4vw,52px)] font-black tracking-tight text-ink leading-[1.05]">
            Transparent pricing for teams of any scale.
          </h2>
          <p className="mt-4 text-base text-[#52564d] font-medium">
            Start self-hosted for free or upgrade to managed cloud studio for your entire team.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card relative flex flex-col justify-between rounded-2xl border p-8 transition hover:-translate-y-1 ${
                plan.isFeatured
                  ? "border-ink bg-[#141512] text-white shadow-2xl hover:shadow-[5px_5px_0_#d8ff43]"
                  : "border-line bg-surface text-ink shadow-sm hover:border-ink hover:shadow-[5px_5px_0_#d8ff43]"
              }`}
            >
              {plan.isFeatured && (
                <span className="absolute -top-3 left-8 rounded-full bg-lime px-3 py-1 font-mono text-[10px] font-black text-ink shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${plan.isFeatured ? "text-white" : "text-ink"}`}>
                    {plan.name}
                  </h3>
                  {!plan.isFeatured && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#7a7d73] font-bold">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-xs ${plan.isFeatured ? "text-[#a0a398]" : "text-[#7a7d73]"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <p className={`mt-4 text-xs leading-relaxed ${plan.isFeatured ? "text-[#c5c8bd]" : "text-[#52564d]"}`}>
                  {plan.desc}
                </p>

                <div className={`my-8 border-t ${plan.isFeatured ? "border-[#2e3028]" : "border-line"}`} />

                <ul className="space-y-3.5 text-xs">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded-full mt-0.5 ${
                          plan.isFeatured ? "bg-lime text-ink" : "bg-ink text-lime"
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span className={plan.isFeatured ? "text-[#e0e2d8]" : "text-ink font-medium"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10">
                <Button
                  href="/register"
                  size="md"
                  variant={plan.buttonVariant}
                  fullWidth
                >
                  {plan.buttonText}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
