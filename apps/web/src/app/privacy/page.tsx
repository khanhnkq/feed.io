import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  EyeOff,
  FileCheck,
  Key,
  Lock,
  Mail,
  Scale,
  Shield,
  Trash2,
} from "lucide-react";

import { Button } from "@/modules/ui";
import { LandingFooter } from "@/modules/landing";

export const metadata: Metadata = {
  title: "Privacy Policy — Feedi Video Collaboration Platform",
  description:
    "Learn how Feedi collects, handles, and protects your media cuts, account credentials, and Google OAuth user data.",
};

const sections = [
  { id: "introduction", title: "1. Overview & Studio Principles" },
  { id: "information-collected", title: "2. Information We Collect" },
  { id: "google-limited-use", title: "3. Google OAuth & Limited Use Policy" },
  { id: "how-we-use-data", title: "4. How We Use Collected Data" },
  { id: "media-security", title: "5. Media Storage & Frame-Accurate Assets" },
  { id: "collaboration-telemetry", title: "6. Real-Time Collaboration & WebSockets" },
  { id: "cookies-sessions", title: "7. Cookies & Session Security (PKCE)" },
  { id: "data-sharing", title: "8. Third Parties & Zero Data Selling" },
  { id: "retention-deletion", title: "9. Data Retention & Deletion Rights" },
  { id: "user-rights", title: "10. Your Privacy Rights (GDPR & CCPA)" },
  { id: "security-safeguards", title: "11. Security Safeguards & Encryption" },
  { id: "contact", title: "12. Contact & Data Protection Officer" },
];

export default function PrivacyPolicyPage() {
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
              Legal Documentation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button href="/landing" size="sm" variant="ghost">
              <ArrowLeft className="size-3.5" />
              <span>Back to home</span>
            </Button>
            <Button href="/login" size="sm" variant="outline">
              Sign In
            </Button>
            <Button href="/register" size="sm" variant="primary">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-line bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
              <span className="size-2 rounded-full bg-lime animate-pulse" />
              FEEDI STUDIO LEGAL DIRECTIVE // REV 2026.09
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-ink">
              Privacy Policy & Data Stewardship
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted">
              We build private, frame-accurate review and approval infrastructure for video
              studios, editors, and post-production craftspeople. Your creative IP, video cut
              files, and credentials remain strictly yours.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
              <span className="rounded-md border border-line bg-paper px-2.5 py-1">
                <strong>Effective:</strong> September 27, 2026
              </span>
              <span className="rounded-md border border-line bg-paper px-2.5 py-1">
                <strong>Version:</strong> 1.2 (Studio & OAuth Edition)
              </span>
              <span className="rounded-md border border-lime/60 bg-lime/20 px-2.5 py-1 text-ink font-semibold">
                Google API Limited Use: Compliant
              </span>
            </div>
          </div>

          {/* 4 Trust Highlights / Bento Grid */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-paper p-5 transition hover:shadow-[5px_5px_0_#d8ff43]">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface border border-line text-ink">
                <EyeOff className="size-5 text-ink" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink">Zero Creative IP Harvesting</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                We never inspect, monetize, or use your video cuts, raw audio, or annotations to
                train artificial intelligence or public models.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 transition hover:shadow-[5px_5px_0_#d8ff43]">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface border border-line text-ink">
                <Lock className="size-5 text-ink" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink">Isolated S3 Object Storage</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                High-bitrate ProRes/H.264 assets are stored in tenant-isolated S3 buckets with
                time-limited signed playback URLs and strict access control.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 transition hover:shadow-[5px_5px_0_#d8ff43]">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface border border-line text-ink">
                <Key className="size-5 text-ink" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink">Minimalist Google OAuth</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Only basic identity scopes (OpenID, verified email, name) are requested. We never
                request access to your Google Drive, Gmail, or contacts.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 transition hover:shadow-[5px_5px_0_#d8ff43]">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface border border-line text-ink">
                <Trash2 className="size-5 text-ink" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink">Permanent Deletion Guarantee</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                When a project, media asset, or account is deleted, all transcoded renditions,
                thumbnails, and database records are immediately purged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Content */}
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
          {/* Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <Scale className="size-4 text-ink" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Table of Contents
                </h4>
              </div>
              <nav className="mt-4 flex flex-col gap-1.5 text-xs">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="rounded px-2.5 py-1.5 text-muted transition hover:bg-paper hover:text-ink font-medium leading-tight"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 border-t border-line pt-4">
                <p className="font-mono text-[11px] text-muted">
                  Questions? Contact our legal & privacy counsel:
                </p>
                <a
                  href="mailto:privacy@feedio.local"
                  className="mt-2 inline-flex items-center gap-1.5 font-bold text-ink underline underline-offset-2 text-xs"
                >
                  <Mail className="size-3.5" />
                  privacy@feedio.local
                </a>
              </div>
            </div>
          </aside>

          {/* Document Content Sections */}
          <article className="prose-neutral max-w-none text-ink leading-relaxed space-y-16">
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                01 // INTRODUCTION
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                1. Overview & Studio Principles
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Feedi (&ldquo;Feedi&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Feedi video review
                and collaboration platform. This Privacy Policy describes how we collect, store,
                use, and safeguard information when you use our web applications, desktop
                integrations, and public review links.
              </p>
              <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
                We understand that commercial film cuts, broadcast spots, motion graphics, and audio
                stems represent sensitive, confidential client IP. Our core architectural tenet is
                minimalism: we only collect the data strictly required to render high-fidelity media,
                maintain authenticated sessions, and enable frame-level team feedback.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="information-collected" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                02 // DATA INVENTORY
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                2. Information We Collect
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                We categorize the information processed by Feedi into four functional buckets:
              </p>

              <div className="mt-6 grid gap-4">
                <div className="rounded-lg border border-line bg-surface p-5">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <Key className="size-4 text-ink" />
                    Account & Profile Data
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-muted">
                    When registering via email, we collect your work email address, argon2-hashed
                    passwords (or nullable password tokens for OAuth logins), display names, and
                    organization memberships.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface p-5">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <Database className="size-4 text-ink" />
                    Creative Media Assets & Transcoding Outputs
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-muted">
                    Video master files (ProRes, DNxHR, H.264, HEVC), audio files, waveform data,
                    derived HLS multi-bitrate streams, and poster frame thumbnails uploaded to your
                    projects.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface p-5">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <FileCheck className="size-4 text-ink" />
                    Review Feedback, Timecodes & Approvals
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-muted">
                    SMPTE timecode comments, vector pen drawing coordinates, version approval
                    decisions, user mentions, and resolution statuses.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface p-5">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <Shield className="size-4 text-ink" />
                    Technical Telemetry & Audit Logs
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-muted">
                    Client IP addresses for rate-limiting defense, user-agent signatures for session
                    security auditing, and diagnostic logs to troubleshoot playback issues.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Google OAuth & Limited Use Policy */}
            <section
              id="google-limited-use"
              className="scroll-mt-24 border-t border-line pt-12"
            >
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                03 // OAUTH 2.0 DISCLOSURE
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                3. Google OAuth & Limited Use Disclosure
              </h2>

              <div className="mt-6 rounded-xl border-2 border-lime/80 bg-lime/10 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 shrink-0 text-ink mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                      Google API Services User Data Policy Compliance
                    </h4>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink/90">
                      Feedi&apos;s use and transfer to any other app of information received from
                      Google APIs adheres strictly to the{" "}
                      <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline underline-offset-2 hover:text-ink inline-flex items-center gap-1"
                      >
                        Google API Services User Data Policy
                        <ExternalLink className="size-3" />
                      </a>
                      , including the <strong>Limited Use</strong> requirements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-muted leading-relaxed">
                <p>
                  When you authenticate using <strong>&ldquo;Sign in with Google&rdquo;</strong>, our backend
                  exchanges a short-lived authorization code using <strong>PKCE SHA-256</strong> to
                  request only the following non-sensitive OpenID scopes:
                </p>

                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink border border-line">
                      openid
                    </code>
                    : Cryptographically verifies your identity token issued by Google.
                  </li>
                  <li>
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink border border-line">
                      email
                    </code>
                    : Retrieves your primary Google email address and verification status (
                    <code className="text-xs">email_verified</code>) to create or link your Feedi account.
                  </li>
                  <li>
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink border border-line">
                      profile
                    </code>
                    : Retrieves your name and profile avatar URL to identify your comments and cursor
                    presences to your collaborators.
                  </li>
                </ul>

                <div className="rounded-lg border border-line bg-surface p-5 text-xs text-ink">
                  <strong>Explicit Non-Access Commitments:</strong>
                  <ul className="mt-2 space-y-1.5 list-disc pl-4 text-muted">
                    <li>We do <strong>NOT</strong> request or read your Google Drive files or YouTube accounts.</li>
                    <li>We do <strong>NOT</strong> request access to your Gmail messages, calendars, or contacts.</li>
                    <li>We do <strong>NOT</strong> sell Google user data to data brokers or advertising networks.</li>
                    <li>We do <strong>NOT</strong> use Google user data to train generalized AI/ML models.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. How We Use Collected Data */}
            <section id="how-we-use-data" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                04 // PURPOSE & LEGAL BASIS
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                4. How We Use Collected Data
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                We process your personal data exclusively under legitimate contractual and
                operational bases:
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs border border-line rounded-lg overflow-hidden">
                  <thead className="bg-surface border-b border-line font-mono text-[11px] uppercase tracking-wider text-ink">
                    <tr>
                      <th className="p-3">Data Category</th>
                      <th className="p-3">Specific Purpose</th>
                      <th className="p-3">Legal Basis (GDPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-paper text-muted">
                    <tr>
                      <td className="p-3 font-semibold text-ink">Email & Identity</td>
                      <td className="p-3">Account authentication, password resets, transactional email verification</td>
                      <td className="p-3 font-mono text-[11px]">Contractual Necessity (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink">Video Assets</td>
                      <td className="p-3">Transcoding into streamable HLS, extracting audio waveforms and thumbnails</td>
                      <td className="p-3 font-mono text-[11px]">Contractual Necessity (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink">Comments & Drawing</td>
                      <td className="p-3">Displaying frame-accurate annotations and collaborative reviewer threads</td>
                      <td className="p-3 font-mono text-[11px]">Contractual Necessity (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-ink">IP & Request Logs</td>
                      <td className="p-3">Preventing brute-force attacks, DDoS prevention, rate-limit enforcement</td>
                      <td className="p-3 font-mono text-[11px]">Legitimate Interest (Art. 6(1)(f))</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Media Security & Storage */}
            <section id="media-security" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                05 // MEDIA STORAGE
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                5. Video Media Storage & Frame-Accurate Security
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Feedi is built around a distributed object architecture using S3-compliant
                distributed block storage (Garage S3 / AWS S3).
              </p>
              <ul className="mt-4 space-y-3 text-sm text-muted list-disc pl-5">
                <li>
                  <strong>Private Buckets:</strong> Raw video assets are stored in private, non-public
                  buckets. No media URL is directly enumerable on the public internet.
                </li>
                <li>
                  <strong>Tokenized Playback:</strong> Media streams are distributed exclusively via
                  scoped, short-lived signed URLs generated on-demand for authenticated studio members
                  or authorized guest review tokens.
                </li>
                <li>
                  <strong>Encryption at Rest & Transit:</strong> All assets are encrypted in transit
                  via TLS 1.3 and encrypted at rest with AES-256 block encryption.
                </li>
              </ul>
            </section>

            {/* 6. Collaboration Telemetry */}
            <section
              id="collaboration-telemetry"
              className="scroll-mt-24 border-t border-line pt-12"
            >
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                06 // REAL-TIME PRESENCE
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                6. Real-Time Collaboration & WebSockets
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                When multiple team members review the same cut simultaneously, Feedi establishes
                an encrypted WebSocket channel to broadcast live playback scrubber positions,
                active commentator presence avatars, and remote session revocations.
              </p>
              <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
                Live scrubber timestamps and cursor presence signals are <strong>ephemeral</strong> and
                stored temporarily in Valkey/Redis with strict TTLs (Time-To-Live of 120 seconds).
                They are never permanently archived in long-term databases.
              </p>
            </section>

            {/* 7. Cookies & Sessions */}
            <section id="cookies-sessions" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                07 // COOKIES & SESSIONS
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                7. Cookies & Session Security (PKCE)
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Feedi rejects intrusive third-party advertising cookies. We only set strictly
                necessary, first-party authentication cookies:
              </p>

              <div className="mt-6 space-y-3 font-mono text-xs">
                <div className="rounded-lg border border-line bg-surface p-3.5">
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span>feedio_access_token</span>
                    <span className="rounded bg-paper px-2 py-0.5 text-[10px] text-muted">
                      HttpOnly · SameSite=Lax · 5 min TTL
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-muted text-xs">
                    Signed JWT bearer token granting API access to your authenticated tenant.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface p-3.5">
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span>feedio_refresh_token</span>
                    <span className="rounded bg-paper px-2 py-0.5 text-[10px] text-muted">
                      HttpOnly · SameSite=Lax · 30 days
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-muted text-xs">
                    Single-use rotated token stored securely to renew expired sessions.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface p-3.5">
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span>feedio_oauth_state / feedio_oauth_verifier</span>
                    <span className="rounded bg-paper px-2 py-0.5 text-[10px] text-muted">
                      HttpOnly · SameSite=Lax · 10 min TTL
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-muted text-xs">
                    Cryptographic PKCE verifier and CSRF token used exclusively during the Google
                    OAuth handshake, destroyed immediately after exchange.
                  </p>
                </div>
              </div>
            </section>

            {/* 8. Third Parties & Zero Selling */}
            <section id="data-sharing" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                08 // DATA TRANSFERS
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                8. Third Parties & Zero Data Selling
              </h2>
              <div className="mt-4 rounded-lg border border-line bg-surface p-6 text-sm text-ink leading-relaxed">
                <p className="font-bold">
                  We do not sell, rent, lease, or monetize your personal data, video assets, or
                  project metadata to any commercial entity or third party. Ever.
                </p>
                <p className="mt-3 text-muted text-xs sm:text-sm">
                  We only share data with infrastructure sub-processors essential to delivering the
                  service (e.g., self-hosted/dedicated cloud hosting providers, transactional SMTP
                  relays for verification emails, and Google Identity Services exclusively for OAuth
                  authentication).
                </p>
              </div>
            </section>

            {/* 9. Retention & Deletion */}
            <section id="retention-deletion" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                09 // DATA LIFECYCLE
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                9. Data Retention & Permanent Deletion Rights
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                You maintain sovereign ownership of your creative archive:
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-muted list-disc pl-5">
                <li>
                  <strong>Project Asset Deletion:</strong> Deleting a video version or media item
                  immediately marks it for garbage collection and purges the object from storage
                  within 24 hours.
                </li>
                <li>
                  <strong>Account Deletion:</strong> You can delete your account at any time from
                  Account Settings or by contacting support. Upon account deletion, all personal
                  identifiers, sessions, and linked OAuth identities are permanently destroyed.
                </li>
                <li>
                  <strong>Audit Log Retention:</strong> Security access audit logs are retained for
                  90 days for forensic defense and subsequently anonymized.
                </li>
              </ul>
            </section>

            {/* 10. User Rights */}
            <section id="user-rights" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                10 // JURISDICTIONAL RIGHTS
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                10. Your Privacy Rights (GDPR & CCPA)
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Under European GDPR, UK Data Protection Act, and California CCPA/CPRA, you have the
                right to:
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-line bg-surface p-4">
                  <strong className="block text-ink font-bold">Right of Access (Art. 15)</strong>
                  <span className="text-muted mt-1 block">
                    Request a full JSON export of all personal data, comments, and project associations.
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-surface p-4">
                  <strong className="block text-ink font-bold">Right to Rectification (Art. 16)</strong>
                  <span className="text-muted mt-1 block">
                    Update incorrect names, emails, or credentials directly in your user profile.
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-surface p-4">
                  <strong className="block text-ink font-bold">Right to Erasure (Art. 17)</strong>
                  <span className="text-muted mt-1 block">
                    Demand complete scrubbing of your account, media uploads, and identities.
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-surface p-4">
                  <strong className="block text-ink font-bold">Right to Data Portability (Art. 20)</strong>
                  <span className="text-muted mt-1 block">
                    Export comments, timecode markers, and decision logs in standard open formats.
                  </span>
                </div>
              </div>
            </section>

            {/* 11. Security Safeguards */}
            <section id="security-safeguards" className="scroll-mt-24 border-t border-line pt-12">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                11 // DEFENSE IN DEPTH
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                11. Security Safeguards & Encryption
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Feedi employs defense-in-depth principles across all architectural tiers:
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted list-disc pl-5">
                <li>Strict Content Security Policy (CSP) and automated CSRF double-submit token verification.</li>
                <li>Argon2id password hashing with high memory cost factors for password authentication.</li>
                <li>PKCE code verifier and random state checks on all external OAuth handshakes.</li>
                <li>Session revocation engine allowing instant invalidation of rogue devices.</li>
              </ul>
            </section>

            {/* 12. Contact */}
            <section id="contact" className="scroll-mt-24 border-t border-line pt-12 pb-6">
              <div className="inline-block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                12 // CONTACT INFORMATION
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                12. Contact & Data Protection Officer
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                If you have questions, data subject access requests (DSAR), or vulnerability
                disclosures regarding this policy, please reach out directly:
              </p>

              <div className="mt-6 rounded-xl border border-line bg-surface p-6 flex flex-col sm:flex-row gap-6 items-start justify-between">
                <div>
                  <strong className="block text-sm font-bold text-ink">
                    Feedi Data Protection Team
                  </strong>
                  <span className="text-xs text-muted block mt-1">
                    Attn: Legal, Security & Privacy Compliance
                  </span>
                  <span className="text-xs text-muted block">
                    Email: <a href="mailto:privacy@feedio.local" className="text-ink font-semibold underline">privacy@feedio.local</a>
                  </span>
                  <span className="text-xs text-muted block">
                    Security reports: <a href="mailto:security@feedio.local" className="text-ink font-semibold underline">security@feedio.local</a>
                  </span>
                </div>

                <Button
                  href="mailto:privacy@feedio.local"
                  size="md"
                  variant="outline"
                  className="shrink-0"
                >
                  <Mail className="size-4" />
                  <span>Send Privacy Inquiry</span>
                </Button>
              </div>
            </section>
          </article>
        </div>
      </div>

      {/* Pre-Footer Action Banner */}
      <section className="border-t border-line bg-surface py-16 text-center">
        <div className="mx-auto max-w-3xl px-5">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            STUDIO-GRADE PRIVACY BY DEFAULT
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Ready to review cuts with total confidence?
          </h2>
          <p className="mt-4 text-sm text-muted">
            Start collaborating on high-bitrate video projects without compromising creative IP.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/register" size="lg" variant="primary">
              Create Studio Account
            </Button>
            <Button href="/login" size="lg" variant="outline">
              Sign In to Feedi
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
