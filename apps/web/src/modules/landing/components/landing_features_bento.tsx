"use client";

import { useRef } from "react";
import {
  Clock,
  Download,
  Film,
  HardDrive,
  Layers,
  Lock,
  MousePointerClick,
  PenTool,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingFeaturesBento() {
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
              ".bento-header",
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
              ".bento-card",
              { y: 35, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                stagger: 0.1,
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
            gsap.set([".bento-header", ".bento-card"], { autoAlpha: 1, y: 0 });
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="features"
      className="bg-paper py-20 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="bento-header max-w-2xl">
          <h2 className="text-[clamp(32px,4vw,52px)] font-black tracking-tight text-ink leading-[1.05]">
            Built for precision editors and demanding directors.
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Eliminate vague timestamps and endless email threads with purpose-built review tools.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Span 2 cols - Frame Accuracy */}
          <Card className="bento-card md:col-span-2 overflow-hidden bg-surface">
            <CardContent>
              <CardHeader>
                <CardBadge>
                  <Film size={20} />
                </CardBadge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  01 / TIMECODE PRECISION
                </span>
              </CardHeader>

              <CardTitle>Frame-Accurate Video Playback</CardTitle>
              <CardDescription>
                Step forward and backward frame by frame with SMPTE timecode accuracy. Support for 23.98, 24, 25, 29.97, and 60 fps workflows.
              </CardDescription>

              {/* Interactive Micro Simulation inside Card */}
              <div className="mt-8 rounded-xl border border-line bg-[#141512] p-5 text-white shadow-inner">
                <div className="flex items-center justify-between border-b border-[#262820] pb-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-lime" />
                    <span className="font-bold text-white">00:02:14:18</span>
                    <span className="text-[#72756a]">[FRAME 3234]</span>
                  </div>
                  <div className="flex gap-1.5">
                    <kbd className="rounded border border-[#33362b] bg-[#1c1e18] px-1.5 py-0.5 text-[10px] font-bold text-lime">
                      J
                    </kbd>
                    <kbd className="rounded border border-[#33362b] bg-[#1c1e18] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      K
                    </kbd>
                    <kbd className="rounded border border-[#33362b] bg-[#1c1e18] px-1.5 py-0.5 text-[10px] font-bold text-lime">
                      L
                    </kbd>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 text-xs text-[#a0a398]">
                  <span className="size-2 rounded-full bg-lime animate-ping" />
                  <span>ProRes 422 & H.264 instant streaming with zero proxy lag</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Span 1 col - Direct Canvas Drawing */}
          <Card className="bento-card bg-surface">
            <CardContent>
              <CardHeader>
                <CardBadge>
                  <PenTool size={20} />
                </CardBadge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  02 / ANNOTATION
                </span>
              </CardHeader>

              <CardTitle>Draw Directly on Frames</CardTitle>
              <CardDescription>
                Draw arrows, freehand sketches, and highlight boxes directly over the video to give unmistakable feedback.
              </CardDescription>

              <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-paper p-6 text-center">
                <span className="rounded-lg bg-surface border border-line p-2 text-ink shadow-sm">
                  <PenTool size={18} />
                </span>
                <span className="rounded-lg bg-lime text-ink p-2 shadow-sm">
                  <Layers size={18} />
                </span>
                <span className="rounded-lg bg-surface border border-line p-2 text-ink shadow-sm">
                  <MousePointerClick size={18} />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Span 1 col - Guest Review Links */}
          <Card className="bento-card bg-surface">
            <CardContent>
              <CardHeader>
                <CardBadge>
                  <ShieldCheck size={20} />
                </CardBadge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  03 / CLIENT ACCESS
                </span>
              </CardHeader>

              <CardTitle>Frictionless Review Links</CardTitle>
              <CardDescription>
                Share password-protected or one-click links. Clients can review and approve on mobile or desktop without creating an account.
              </CardDescription>

              <div className="mt-8 rounded-xl border border-line bg-[#f5f6ee] p-4 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-ink">
                  <span className="flex items-center gap-1.5">
                    <Lock size={12} className="text-muted" /> Passcode Protection
                  </span>
                  <span className="text-lime bg-ink px-1.5 py-0.5 rounded text-[10px]">ENABLED</span>
                </div>
                <div className="flex items-center justify-between text-ink">
                  <span className="flex items-center gap-1.5">
                    <Download size={12} className="text-muted" /> Download Master
                  </span>
                  <span className="text-muted text-[10px]">DISABLED</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Span 2 cols - S3 Data Sovereignty */}
          <Card className="bento-card md:col-span-2 bg-[#141512] text-white border-[#2e3028]">
            <CardContent>
              <CardHeader>
                <CardBadge>
                  <HardDrive size={20} />
                </CardBadge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-lime">
                  04 / SELF-HOSTED PRIVACY
                </span>
              </CardHeader>

              <CardTitle className="text-white group-hover:text-white">
                100% Data Sovereignty & Self-Hosted Storage
              </CardTitle>
              <CardDescription className="text-[#a0a398]">
                Connect your own S3 or Garage storage cluster. Keep unreleased cuts strictly confidential within your private cloud infrastructure without third-party vendor lock-in.
              </CardDescription>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#262820] text-center">
                <div className="p-3 bg-[#1c1e18] rounded-xl border border-[#2e3028]">
                  <span className="font-mono text-xl font-bold text-lime">0%</span>
                  <span className="block text-[11px] text-[#8e9185] mt-1">Egress Cloud Markup</span>
                </div>
                <div className="p-3 bg-[#1c1e18] rounded-xl border border-[#2e3028]">
                  <span className="font-mono text-xl font-bold text-white">S3 / Garage</span>
                  <span className="block text-[11px] text-[#8e9185] mt-1">Direct Multipart Upload</span>
                </div>
                <div className="p-3 bg-[#1c1e18] rounded-xl border border-[#2e3028]">
                  <span className="font-mono text-xl font-bold text-white">Full NVMe</span>
                  <span className="block text-[11px] text-[#8e9185] mt-1">Edge HLS Caching</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
