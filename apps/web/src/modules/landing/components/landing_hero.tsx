"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play } from "lucide-react";

import { Button } from "@/modules/ui";
import { gsap, useGSAP } from "../lib/gsap_init";
import { InteractivePlayerPreview } from "./interactive_player_preview";

const ROLES = [
  "Video Editors",
  "Colorists & DITs",
  "Creative Directors",
  "VFX Artists",
  "Post Houses",
];

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);
  const roleTextRef = useRef<HTMLSpanElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);

  // Kinetic Rotating Text Effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!roleTextRef.current) return;

      // Animate out current word
      gsap.to(roleTextRef.current, {
        y: -18,
        autoAlpha: 0,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          setRoleIndex((prev) => (prev + 1) % ROLES.length);
          // Animate in next word
          gsap.fromTo(
            roleTextRef.current,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.7)" }
          );
        },
      });
    }, 2800);

    return () => clearInterval(interval);
  }, []);

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

          if (isMotionAllowed) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.from(".hero-eyebrow", {
              y: -20,
              autoAlpha: 0,
              duration: 0.6,
            })
              .from(
                ".hero-heading",
                {
                  y: 35,
                  autoAlpha: 0,
                  duration: 0.8,
                },
                "-=0.35"
              )
              .from(
                ".hero-role-pill",
                {
                  scale: 0.85,
                  autoAlpha: 0,
                  duration: 0.5,
                  ease: "back.out(1.8)",
                },
                "-=0.4"
              )
              .from(
                ".hero-subtext",
                {
                  y: 20,
                  autoAlpha: 0,
                  duration: 0.6,
                },
                "-=0.4"
              )
              .from(
                ".hero-cta-btn",
                {
                  y: 18,
                  autoAlpha: 0,
                  scale: 0.95,
                  stagger: 0.12,
                  duration: 0.5,
                  ease: "back.out(1.6)",
                },
                "-=0.3"
              )
              .from(
                ".hero-preview-wrapper",
                {
                  y: 60,
                  autoAlpha: 0,
                  scale: 0.97,
                  duration: 0.9,
                  ease: "power2.out",
                },
                "-=0.4"
              );
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Main Hero Header Stack */}
        <div className="mx-auto max-w-4xl text-center">
          <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[.14em] text-ink shadow-2xs">
            <span className="size-2 rounded-full bg-lime animate-pulse" />
            CREATIVE VIDEO COLLABORATION
          </span>

          <h1 className="hero-heading mt-5 text-[clamp(40px,5.5vw,74px)] font-black tracking-[-0.055em] text-ink leading-[0.98]">
            Frame-accurate review. <br className="hidden sm:inline" />
            <span className="text-[#686b60]">Built for </span>
            <span className="hero-role-pill inline-block rounded-xl border border-ink bg-ink px-3 py-1 text-lime font-black shadow-[4px_4px_0_#d8ff43]">
              <span ref={roleTextRef} className="inline-block">
                {ROLES[roleIndex]}
              </span>
            </span>
          </h1>

          <p className="hero-subtext mx-auto mt-6 max-w-[55ch] text-base md:text-lg leading-relaxed text-[#52564d] font-medium">
            Stream high-bitrate video cuts, pinpoint timestamped annotations, and collect client approvals without accounts or email chains.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="hero-cta-btn">
              <Button href="/register" size="lg" variant="primary">
                <span>Start free trial</span>
                <ArrowRight size={16} />
              </Button>
            </div>
            <div className="hero-cta-btn">
              <Button href="/login" size="lg" variant="outline">
                <Play size={15} />
                <span>Live workspace demo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Interactive Studio Preview Component */}
        <div className="hero-preview-wrapper mt-14 md:mt-18">
          <InteractivePlayerPreview />
        </div>
      </div>
    </section>
  );
}
