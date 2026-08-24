"use client";

import { useRef } from "react";
import { AnimatedCounter } from "./animated_counter";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingMetricsStrip() {
  const containerRef = useRef<HTMLElement>(null);

  const metrics = [
    {
      end: 99.9,
      decimals: 1,
      suffix: "%",
      label: "SMPTE Frame Sync Precision",
      sub: "24, 25, 30 & 60 fps standard",
    },
    {
      prefix: "< ",
      end: 45,
      suffix: "ms",
      label: "Edge Playback Latency",
      sub: "Zero-wait video scrubbing",
    },
    {
      end: 10,
      suffix: "x",
      label: "Faster Client Sign-offs",
      sub: "Eliminate email feedback rounds",
    },
    {
      end: 0,
      suffix: " Logins",
      label: "Zero Client Friction",
      sub: "Passwordless guest review links",
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
              ".metric-card",
              { y: 25, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                stagger: 0.1,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 90%",
                  once: true,
                },
              }
            );
          } else {
            gsap.set(".metric-card", { autoAlpha: 1, y: 0 });
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="border-b border-line bg-paper py-16"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="metric-card flex flex-col justify-between rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[4px_4px_0_#d8ff43]"
            >
              <div>
                <span className="font-mono text-3xl md:text-4xl font-black tracking-tight text-ink">
                  <AnimatedCounter
                    end={item.end}
                    decimals={item.decimals}
                    prefix={item.prefix}
                    suffix={item.suffix}
                  />
                </span>
                <strong className="mt-3 block text-sm font-bold text-ink">
                  {item.label}
                </strong>
              </div>

              <p className="mt-2 text-xs text-[#73766d]">
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
