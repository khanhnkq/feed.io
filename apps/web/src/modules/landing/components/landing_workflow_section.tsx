"use client";

import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Share2, UploadCloud } from "lucide-react";
import { gsap, useGSAP } from "../lib/gsap_init";

export function LandingWorkflowSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Upload raw or master cuts",
      desc: "Drag-and-drop ProRes, H.264, or MP4 files. Automatic background transcoding prepares instant 1080p and 4K streaming proxies with zero lag.",
      icon: UploadCloud,
      mockup: {
        badge: "MULTIPART DIRECT S3 UPLOAD",
        title: "COMMERCIAL_CUT_MASTER_V4.MOV",
        progress: 88,
        status: "Transcoding HLS Proxies…",
        detail: "3.4 GB of 3.8 GB (142 MB/s)",
      },
    },
    {
      num: "02",
      title: "Share a private review link",
      desc: "Send a password-protected or one-click link to your client or director. No sign-up required for guests to leave frame-linked notes.",
      icon: Share2,
      mockup: {
        badge: "SECURE GUEST ACCESS LINK",
        title: "feed.io/review/prj_9824_v4",
        progress: 100,
        status: "Active & Passcode Protected",
        detail: "3 Reviewers Currently Live",
      },
    },
    {
      num: "03",
      title: "Approve and deliver finals",
      desc: "Track completed feedback items, stack new versions to compare cuts side-by-side, and secure client approval in record time.",
      icon: CheckCircle2,
      mockup: {
        badge: "CLIENT SIGN-OFF VERIFIED",
        title: "FINAL APPROVAL GRANTED",
        progress: 100,
        status: "Export Final Delivery Package",
        detail: "All 18 Notes Resolved & Verified",
      },
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
              ".workflow-header",
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
              ".workflow-card",
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

            gsap.fromTo(
              ".workflow-simulation",
              { y: 30, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: ".workflow-simulation",
                  start: "top 90%",
                  once: true,
                },
              }
            );
          } else {
            gsap.set([".workflow-header", ".workflow-card", ".workflow-simulation"], {
              autoAlpha: 1,
              y: 0,
            });
          }
        }
      );
    },
    { scope: containerRef }
  );

  const currentMock = steps[activeStep].mockup;

  return (
    <section
      ref={containerRef}
      id="workflow"
      className="border-t border-line bg-surface py-20 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="workflow-header max-w-xl">
          <h2 className="text-[clamp(32px,4vw,52px)] font-black tracking-tight text-ink leading-[1.05]">
            How Feed.io accelerates post-production.
          </h2>
          <p className="mt-4 text-base text-muted">
            A frictionless three-step pipeline engineered for creative agility.
          </p>
        </div>

        {/* 3 Steps Cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`workflow-card cursor-pointer relative flex flex-col justify-between rounded-xl border p-8 transition-all duration-300 ${
                  isSelected
                    ? "border-ink bg-paper shadow-[5px_5px_0_#d8ff43] -translate-y-1"
                    : "border-line bg-paper/60 hover:border-ink hover:bg-paper"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid size-12 place-items-center rounded-lg font-mono text-base font-black transition-all ${
                        isSelected
                          ? "bg-lime text-ink scale-110 shadow-sm"
                          : "bg-surface border border-line text-muted"
                      }`}
                    >
                      {step.num}
                    </span>
                    <Icon
                      className={isSelected ? "text-ink" : "text-muted"}
                      size={24}
                    />
                  </div>

                  <h3 className="mt-8 text-xl font-bold tracking-tight text-ink">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-2 font-mono text-xs font-bold text-ink">
                  <span>{isSelected ? "Active simulation" : "View flow step"}</span>
                  <ArrowRight
                    size={14}
                    className={isSelected ? "text-lime translate-x-1" : "text-muted"}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Interactive Step Simulation Box */}
        <div className="workflow-simulation mt-10 overflow-hidden rounded-2xl border border-line bg-[#141512] p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-[#262820] pb-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-lime font-mono text-sm font-black text-ink">
                {steps[activeStep].num}
              </span>
              <div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-lime">
                  {currentMock.badge}
                </span>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  {currentMock.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="size-2 rounded-full bg-lime animate-ping" />
              <span className="text-[#a0a398]">{currentMock.status}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#252720]">
                <div
                  className="h-full bg-lime transition-all duration-500 rounded-full"
                  style={{ width: `${currentMock.progress}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-xs text-[#7a7d73]">
                {currentMock.detail}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  className={`size-2.5 rounded-full transition-all ${
                    activeStep === i
                      ? "bg-lime w-7"
                      : "bg-[#33362b] hover:bg-[#55584a]"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
