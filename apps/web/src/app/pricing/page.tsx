import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Minus,
  Sparkles,
  HelpCircle,
  HardDrive,
  Users,
  ShieldCheck,
  Film,
  Zap,
} from "lucide-react";

import { Button } from "@/modules/ui";
import { LandingFooter, PricingCalculator } from "@/modules/landing";

export const metadata: Metadata = {
  title: "Pricing — Feedi Video Collaboration Platform (No Per-Seat Fees)",
  description:
    "Transparent storage-based pricing for video review. Unlimited members on every paid plan starting at $5/month for 100 GB. Self-host free forever.",
};

const comparisonFeatures = [
  {
    category: "Storage & Team Capacity",
    features: [
      {
        name: "Storage Quota",
        free: "5 GB",
        p100: "100 GB",
        p500: "500 GB",
        p1tb: "1 TB",
        enterprise: "Custom (5 TB+)",
      },
      {
        name: "Team Members",
        free: "Up to 5",
        p100: "Unlimited",
        p500: "Unlimited",
        p1tb: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Client & Reviewer Seats",
        free: "Free (included)",
        p100: "Free (included)",
        p500: "Free (included)",
        p1tb: "Free (included)",
        enterprise: "Free (included)",
      },
      {
        name: "Active Projects",
        free: "Unlimited",
        p100: "Unlimited",
        p500: "Unlimited",
        p1tb: "Unlimited",
        enterprise: "Unlimited",
      },
    ],
  },
  {
    category: "Video Review & Annotations",
    features: [
      {
        name: "Frame-Accurate Video Player",
        free: true,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Timestamped Comments & Canvas Drawings",
        free: true,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Password-Protected Share Links",
        free: true,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Approval Workflows & Client Sign-Offs",
        free: true,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Version Stacking & Compare",
        free: "Basic (2 cuts)",
        p100: "Full history",
        p500: "Full history",
        p1tb: "Full history",
        enterprise: "Full history",
      },
    ],
  },
  {
    category: "Studio & Post-Production Workflow",
    features: [
      {
        name: "NLE Marker Export (FCPXML, DaVinci, Premiere)",
        free: false,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Synchronized Split-Screen Version Compare",
        free: false,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Custom Project Statuses & Stages",
        free: false,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "Social Preview & Studio Watermarking",
        free: false,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: "Custom Domain",
      },
    ],
  },
  {
    category: "Infrastructure & Security",
    features: [
      {
        name: "Accelerated S3 Edge Streaming",
        free: "Standard",
        p100: "Accelerated",
        p500: "Accelerated",
        p1tb: "Accelerated",
        enterprise: "Dedicated S3 Bucket",
      },
      {
        name: "AES-256 Storage & TLS 1.3 Encryption",
        free: true,
        p100: true,
        p500: true,
        p1tb: true,
        enterprise: true,
      },
      {
        name: "SAML 2.0 / Okta Single Sign-On (SSO)",
        free: false,
        p100: false,
        p500: false,
        p1tb: false,
        enterprise: true,
      },
      {
        name: "Dedicated Success Manager & Custom SLA",
        free: false,
        p100: false,
        p500: false,
        p1tb: false,
        enterprise: true,
      },
    ],
  },
];

const faqs = [
  {
    q: "Why does Feedi reject per-seat pricing?",
    a: "Traditional video collaboration platforms charge $15–$25 for every person who touches your project. That penalizes studios whenever they invite clients, directors, sound designers, or colorists for brief reviews. We believe seats should be free; we only charge for the storage and proxy transcoding infrastructure your cuts consume.",
  },
  {
    q: "What happens if our Free workspace hits 5 members?",
    a: "Free workspaces are capped at five members. When you want to invite a 6th collaborator, you can upgrade to any paid plan (starting at just $5/month for 100 GB). The moment you upgrade, member limits are removed completely—you can invite 10, 50, or 200 team members without paying a cent extra.",
  },
  {
    q: "How is my storage quota calculated?",
    a: "Your storage footprint is calculated based on the media files uploaded to your active projects, plus automatic proxy versions generated for frame-accurate browser playback. When you delete cuts or archive old versions, that storage capacity is immediately freed up.",
  },
  {
    q: "Do clients or guest reviewers need an account or cost a seat?",
    a: "No! Guests reviewing media via your private password-protected share links never need to create an account and never count against your member limit. They can leave frame-accurate drawings and timestamped comments directly from their browser.",
  },
  {
    q: "Can I upgrade, downgrade, or cancel anytime?",
    a: "Yes. Feedi operates with zero lock-in. If you upgrade from 100 GB to 500 GB, changes take effect immediately with prorated billing. If you cancel, your workspace remains fully accessible until the end of your billing cycle, and you can export all your cuts and comment data.",
  },
  {
    q: "What if my production company needs more than 1 TB?",
    a: "For large studios requiring multi-terabyte archives, dedicated private S3 buckets, custom SLAs, or SAML SSO, please reach out to our team at contact@feedi.local. We offer scalable custom volume pricing.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-lime selection:text-ink">
      {/* Top Studio Header */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/landing"
              className="flex items-center gap-2.5 group"
              aria-label="Feedi Home"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-lime font-black text-ink transition group-hover:scale-105">
                F
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                feedi
              </span>
            </Link>

            <span className="hidden sm:inline-block text-line font-mono text-sm">/</span>

            <span className="hidden sm:inline-block font-mono text-xs font-semibold text-muted uppercase tracking-wider">
              Pricing Plans
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button href="/login" size="sm" variant="ghost">
              Sign In
            </Button>
            <Button href="/register" size="sm" variant="primary">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-5 pt-16 pb-24 md:px-8 lg:pt-20">
        {/* Hero Section */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted shadow-sm">
            <Sparkles size={13} className="text-focus" />
            <span>NO PER-SEAT PRICING · EVER</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-ink">
            No per-seat pricing. Ever.
          </h1>

          <p className="mt-5 text-base sm:text-xl text-[#52564d] font-medium leading-relaxed">
            Everyone else bills you by the head. We charge for storage, so a ten-person team pays{" "}
            <span className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">
              $5/month
            </span>{" "}
            and so does a fifty-person one.
          </p>

          <p className="mt-3 text-xs sm:text-sm text-muted">
            FreeFrame open-source architecture with managed cloud reliability. Self-host it free, forever, or let us run it.
          </p>
        </section>

        {/* 1. Interactive Pricing Calculator */}
        <section className="mt-14">
          <PricingCalculator />
        </section>

        {/* 2. Key Value Pillars (3 Bento Trust Cards) */}
        <section className="mt-24 border-t border-line pt-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Why studios choose Feedi over per-seat platforms
            </h2>
            <p className="mt-2 text-sm text-muted">
              Built specifically to eliminate friction between editors, directors, and external clients.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-lg bg-lime text-ink">
                <Users size={20} />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">
                Unlimited Reviewers & Clients
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Never worry about license seats when onboarding a new agency client or freelancer. Everyone gets access without expanding your software bill.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-lg bg-lime text-ink">
                <HardDrive size={20} />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">
                Pay Only For What You Store
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Simple, transparent storage tiers: 100 GB for $5/mo, 500 GB for $15/mo, or 1 TB for $27/mo. Archive finished cuts to immediately reclaim space.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-lg bg-lime text-ink">
                <Film size={20} />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">
                Pro NLE & Timeline Sync
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Export frame-linked reviewer notes directly into DaVinci Resolve, Final Cut Pro, and Adobe Premiere markers with a single click.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Detailed Feature Comparison Matrix */}
        <section className="mt-24 border-t border-line pt-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              DETAILED BREAKDOWN
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Compare plans & features
            </h2>
            <p className="mt-2 text-sm text-muted">
              Every tool you need to deliver commercial video projects on time.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper/50">
                  <th className="p-4 font-bold text-ink">Feature</th>
                  <th className="p-4 font-bold text-ink text-center">Free ($0)</th>
                  <th className="p-4 font-bold text-ink text-center bg-lime/10">Hosted 100 GB ($5)</th>
                  <th className="p-4 font-bold text-ink text-center">Hosted 500 GB ($15)</th>
                  <th className="p-4 font-bold text-ink text-center">Hosted 1 TB ($27)</th>
                  <th className="p-4 font-bold text-ink text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((group, groupIdx) => (
                  <Fragment key={group.category}>
                    <tr className="border-t border-b border-line bg-paper/80 font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                      <td colSpan={6} className="px-4 py-2.5">
                        {group.category}
                      </td>
                    </tr>
                    {group.features.map((row, rowIdx) => (
                      <tr
                        key={row.name}
                        className={`border-b border-line/60 transition hover:bg-paper/30 ${
                          rowIdx % 2 === 0 ? "bg-surface" : "bg-paper/10"
                        }`}
                      >
                        <td className="p-4 font-medium text-ink">{row.name}</td>

                        {/* Free */}
                        <td className="p-4 text-center">
                          {typeof row.free === "boolean" ? (
                            row.free ? (
                              <Check className="inline size-4 text-ink font-bold" />
                            ) : (
                              <Minus className="inline size-4 text-muted/50" />
                            )
                          ) : (
                            <span className="font-mono text-xs">{row.free}</span>
                          )}
                        </td>

                        {/* 100 GB (Highlighted) */}
                        <td className="p-4 text-center bg-lime/5 font-semibold text-ink">
                          {typeof row.p100 === "boolean" ? (
                            row.p100 ? (
                              <Check className="inline size-4 text-focus font-bold" />
                            ) : (
                              <Minus className="inline size-4 text-muted/50" />
                            )
                          ) : (
                            <span className="font-mono text-xs">{row.p100}</span>
                          )}
                        </td>

                        {/* 500 GB */}
                        <td className="p-4 text-center">
                          {typeof row.p500 === "boolean" ? (
                            row.p500 ? (
                              <Check className="inline size-4 text-ink font-bold" />
                            ) : (
                              <Minus className="inline size-4 text-muted/50" />
                            )
                          ) : (
                            <span className="font-mono text-xs">{row.p500}</span>
                          )}
                        </td>

                        {/* 1 TB */}
                        <td className="p-4 text-center">
                          {typeof row.p1tb === "boolean" ? (
                            row.p1tb ? (
                              <Check className="inline size-4 text-ink font-bold" />
                            ) : (
                              <Minus className="inline size-4 text-muted/50" />
                            )
                          ) : (
                            <span className="font-mono text-xs">{row.p1tb}</span>
                          )}
                        </td>

                        {/* Enterprise */}
                        <td className="p-4 text-center">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? (
                              <Check className="inline size-4 text-ink font-bold" />
                            ) : (
                              <Minus className="inline size-4 text-muted/50" />
                            )
                          ) : (
                            <span className="font-mono text-xs font-semibold text-ink">
                              {row.enterprise}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Frequently Asked Questions (FAQ) */}
        <section className="mt-24 border-t border-line pt-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              HAVE QUESTIONS?
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-muted">
              Everything you need to know about our storage-based pricing model.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="rounded-xl border border-line bg-surface p-6 shadow-sm transition hover:border-ink"
              >
                <h3 className="text-base font-bold text-ink flex items-start gap-2.5">
                  <span className="font-mono text-xs text-muted mt-0.5">
                    0{idx + 1}.
                  </span>
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Pre-Footer Call to Action */}
        <section className="mt-24 rounded-2xl border-2 border-ink bg-[#141512] p-8 text-center text-white sm:p-12 shadow-xl">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-lime">
            FRAME-ACCURATE VIDEO COLLABORATION
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
            Ready to review cuts with total confidence?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-[#a0a398]">
            Start free with 5 GB storage. When your team grows, upgrade to 100 GB for $5/mo and invite unlimited reviewers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/register" size="lg" variant="lime">
              Get Started Free &rarr;
            </Button>
            <Button
              href="mailto:contact@feedi.local?subject=Feedi%20Studio%20Inquiry"
              size="lg"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
            >
              Contact Sales
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
