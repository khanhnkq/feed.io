import type { Metadata } from "next";

import {
  LandingArchitectureNodes,
  LandingCtaBanner,
  LandingFeaturesBento,
  LandingFooter,
  LandingHero,
  LandingMetricsStrip,
  LandingNav,
  LandingPricingSection,
  LandingSocialProof,
  LandingWorkflowSection,
  ScrollTriggerRefresh,
} from "@/modules/landing";

export const metadata: Metadata = {
  title: "Feed.io — Frame-Accurate Video Review & Collaboration",
  description:
    "Stream 4K ProRes cuts, draw timestamped annotations, and collect client approvals without logins or friction.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper bg-dot-pattern text-ink selection:bg-lime selection:text-ink">
      <ScrollTriggerRefresh />
      <LandingNav />
      <main id="main-content">
        <LandingHero />
        <LandingSocialProof />
        <LandingMetricsStrip />
        <LandingFeaturesBento />
        <LandingArchitectureNodes />
        <LandingWorkflowSection />
        <LandingPricingSection />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
