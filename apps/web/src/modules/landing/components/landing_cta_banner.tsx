"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/modules/ui";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingCtaBanner() {
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
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top 90%",
                once: true,
              },
            });

            tl.fromTo(
              ".cta-box",
              { scale: 0.96, y: 35, autoAlpha: 0 },
              { scale: 1, y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" }
            )
              .fromTo(
                ".cta-badge",
                { y: -10, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.4 },
                "-=0.3"
              )
              .fromTo(
                ".cta-heading",
                { y: 20, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.5 },
                "-=0.2"
              )
              .fromTo(
                ".cta-subtext",
                { y: 15, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.4 },
                "-=0.3"
              )
              .fromTo(
                ".cta-btn",
                { y: 15, autoAlpha: 0, scale: 0.95 },
                {
                  y: 0,
                  autoAlpha: 1,
                  scale: 1,
                  stagger: 0.1,
                  duration: 0.4,
                  ease: "back.out(1.5)",
                },
                "-=0.2"
              );
          } else {
            gsap.set(
              [".cta-box", ".cta-badge", ".cta-heading", ".cta-subtext", ".cta-btn"],
              { autoAlpha: 1, y: 0, scale: 1 }
            );
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="bg-paper py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="cta-box relative overflow-hidden rounded-3xl border border-[#2e3028] bg-[#141512] bg-dark-grid-pattern p-10 md:p-16 text-center text-white shadow-2xl">
          {/* Subtle Radial Glow */}
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-lime/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-lime/5 blur-3xl pointer-events-none" />

          <span className="cta-badge inline-flex items-center gap-2 rounded-full border border-[#33362b] bg-[#1c1e18] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-lime">
            INSTANT WORKSPACE SETUP
          </span>

          <h2 className="cta-heading mx-auto mt-6 max-w-2xl text-[clamp(32px,4.5vw,56px)] font-black tracking-tight leading-[1.02] text-white">
            Turn chaotic review rounds into final deliveries.
          </h2>

          <p className="cta-subtext mx-auto mt-6 max-w-[50ch] text-sm md:text-base text-[#b5b8ad] leading-relaxed">
            Join creative studios and post houses streamlining video approvals with frame accuracy.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="cta-btn">
              <Button href="/register" size="lg" variant="lime">
                <span>Create your workspace</span>
                <ArrowRight size={16} />
              </Button>
            </div>
            <div className="cta-btn">
              <Button href="/login" size="lg" variant="dark-outline">
                <span>Sign in with existing account</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
