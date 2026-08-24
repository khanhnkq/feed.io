"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingSocialProof() {
  const containerRef = useRef<HTMLElement>(null);
  const marqueeTrackRef = useRef<HTMLDivElement>(null);

  const brands = [
    { name: "APEX FILMS", symbol: "▲", detail: "STUDIOS" },
    { name: "KRONOS", symbol: "◈", detail: "POST" },
    { name: "MONO MEDIA", symbol: "■", detail: "CREATIVE" },
    { name: "VELOCITY", symbol: "⬡", detail: "VFX" },
    { name: "FRAMEWORK", symbol: "✦", detail: "AGENCY" },
    { name: "NEXUS CINEMA", symbol: "◆", detail: "LABS" },
    { name: "AURA POST", symbol: "●", detail: "SOUND" },
    { name: "POLARIS", symbol: "✶", detail: "COLOR" },
  ];

  // Duplicate list to create a seamless infinite loop
  const marqueeItems = [...brands, ...brands];

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

          // Section entrance
          gsap.from(".social-proof-title", {
            y: 15,
            autoAlpha: 0,
            duration: 0.6,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 90%",
            },
          });

          if (isMotionAllowed && marqueeTrackRef.current) {
            // Infinite seamless marquee animation
            const marqueeAnim = gsap.to(marqueeTrackRef.current, {
              xPercent: -50,
              ease: "none",
              duration: 25,
              repeat: -1,
            });

            // Pause on hover
            const track = marqueeTrackRef.current;
            const onMouseEnter = () => marqueeAnim.pause();
            const onMouseLeave = () => marqueeAnim.play();

            track.addEventListener("mouseenter", onMouseEnter);
            track.addEventListener("mouseleave", onMouseLeave);

            return () => {
              track.removeEventListener("mouseenter", onMouseEnter);
              track.removeEventListener("mouseleave", onMouseLeave);
            };
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="overflow-hidden border-y border-line bg-surface py-10"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="social-proof-title text-center font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[#8e9187]">
          Trusted by top post-production studios and creative agencies
        </p>

        {/* Carousel Marquee Container */}
        <div className="relative mt-8 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div
            ref={marqueeTrackRef}
            className="flex w-max items-center gap-12 cursor-grab active:cursor-grabbing select-none"
          >
            {marqueeItems.map((brand, idx) => (
              <div
                key={`${brand.name}-${idx}`}
                className="flex items-center gap-2.5 font-mono text-xs font-black tracking-widest text-ink transition hover:scale-105"
              >
                <span className="text-sm text-lime">{brand.symbol}</span>
                <span>{brand.name}</span>
                <span className="rounded bg-paper px-1.5 py-0.5 text-[9px] font-normal text-muted border border-line">
                  {brand.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
