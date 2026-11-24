# Feedi Motion-Graphic Launch & Product Demo Video — Design Spec

**Date:** 2026-11-24
**Status:** Draft (Pending Approval)
**Target Deliverable:** Programmatic After Effects-style Motion-Graphic Product Demo (`.mp4`) via `apps/video` (`@feedio/video`)
**Live Reference Deployment:** https://feedi.quizken.com

---

## 1. Intent & Why

Feedi (`feedi.quizken.com`) is a deployed, open-source, self-hostable Frame.io alternative built for video editors, colorists, agencies, and production teams with **zero per-seat pricing**.

The goal is to produce a high-impact **After Effects-style SaaS launch & product demo video** exported directly to `.mp4` for **YouTube** and **Social Media** (TikTok, YouTube Shorts, Reels, Facebook, LinkedIn, X). Rather than a slow screen-recording tutorial or talking-head explainer, the video must feel like a flagship Apple / Linear / Vercel launch trailer:
- **100% kinetic typography, 3D UI motion, percussive electronic music, and tactile UI sound effects (no voiceover)** — gripping even when muted in social feeds, and punchy with sound on.
- **English (`en`) first**, built on a strictly typed copy dictionary so rendering a **Vietnamese (`vi`)** `.mp4` later requires only adding `vi.ts` and running one render command.
- **Authentic proof of live deployment:** Combines crisp 60fps vector UI choreography with real captures from https://feedi.quizken.com and real 1080p24 footage (`Peaceful_Valley_Rolling_Apr_10.mp4`) already hosted in Feedi's Appwrite storage under the `super_admin` (`khanh`) workspace (`feedi-8236cafc` / `summer campaign`).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. Create an isolated workspace package `apps/video` (`@feedio/video`) in the pnpm monorepo powered by **Remotion 4 + React 19 + TypeScript** and FFmpeg.
2. Output two broadcast-ready `.mp4` masters (`H.264`, `yuv420p`, `60fps`, `AAC` stereo audio):
   - **Landscape Master (`16:9`):** `1920x1080` @ `60fps`, **66 seconds** (`3960 frames`) for YouTube, X, LinkedIn, Facebook, and Landing Page embed.
   - **Vertical Cutdown (`9:16`):** `1080x1920` @ `60fps`, **44 seconds** (`2640 frames`) for YouTube Shorts, TikTok, and Reels, adapting layout framing via responsive composition props rather than cropping text off-screen.
3. Pull real visual proof from the live deployment:
   - Read-only download of existing `1920x1080` 24fps footage (`Peaceful_Valley_Rolling_Apr_10.mp4`, media ID `d5005590-8a48-4086-82e7-cb895b4bd33b`) and secondary clip (`onenotch-intro-web.mp4`, `b6860c61-f796-48ec-a03b-a0af07f709ae`) from Feedi's Appwrite Cloud Storage bucket (`feedi-storage`), with deterministic local fallback generator if offline.
   - Real Playwright HiDPI captures of https://feedi.quizken.com (`/landing`, `/pricing`, and authenticated `/app/...` workspace view using an ephemeral read-only session or dedicated demo viewer account without mutating existing user data).
4. Generate a **100% royalty-free, Content-ID-safe 120 BPM electronic soundtrack + frame-locked UI SFX** (sub-bass hits, crisp hi-hats, camera whooshes, mechanical `J/K/L` keystrokes, brush draw swoosh, timeline pin pop, approval chime) programmatically mixed to exact frame cues.
5. Externalize every on-screen string into `src/copy/types.ts` + `src/copy/en.ts` so `vi` support is a zero-refactor drop-in.

### Non-Goals
- Voiceover narration, AI TTS speech, subtitles for spoken dialogue, or talking-head webcam footage.
- Modifying any production runtime code in `apps/web` or `apps/backend`.
- Shipping the rendered Vietnamese `.mp4` in Phase 1 (English `.mp4` renders first; Vietnamese copy + render follows once English is approved).

### Anti-Goals (What Makes This a Failure Even If It Renders)
- **Slideshow motion:** Linear opacity fades or flat static slides instead of spring physics, anticipation, overshoot, 3D perspective camera moves (`rotateX`, `rotateY`, `translateZ`), and beat-locked cuts.
- **Blurry close-ups:** Zooming 250% into raster screenshots. Any macro shot (SMPTE timecode, brush stroke, timeline pin, wipe slider, notification bell) must render live React vector UI wrapping crisp 1080p video.
- **Production DB mutation risk:** Deleting, overwriting, or altering existing rows/files owned by `super_admin` (`khanh`) or any real user on Supabase PostgreSQL / Appwrite Cloud.
- **Copyright claims:** Using copyrighted commercial MP3 tracks that trigger YouTube/TikTok Content ID blocks or mutes.

---

## 3. Hard Constraints

1. **File-Length Gate (Builder Call — Scoped to New Work):** `scripts/check-file-lines.sh` sets a `< 400` lines warning / `<= 500` lines failure threshold (41 legacy files in `apps/web` and `apps/backend` currently exceed it on `main`). To honor Non-Goal #2 (zero edits to `apps/web`, `apps/backend`, or `scripts/check-file-lines.sh`), verification scopes line-count checks strictly to `apps/video/` and `docs/superpowers/`, requiring every file we create to stay **under 380 physical lines** with 0 warnings and 0 errors.
2. **Visual Brand System Fidelity (from `apps/web/src/app/globals.css`):**
   - `--color-ink`: `#11130f` | `--color-paper`: `#f3f3ed` | `--color-surface`: `#fbfbf7` | `--color-line`: `#dedfd8` | `--color-muted`: `#73766d`
   - Accents: `--color-lime`: `#d8ff43` | `--color-orange`: `#ff9d62` | `--color-cyan`: `#81dce2` | `--color-lilac`: `#c9c6ff`
   - Typography: `Inter` (`800/900` tight editorial tracking `-0.055em`) + monospace (`SFMono / JetBrains Mono / ui-monospace`) for SMPTE timecodes (`00:00:08:14`), frame counters, and telemetry badges.
   - Neo-brutalist signature styling: hard offset lime shadows (`4px 4px 0 #d8ff43`), architectural dot/grid backgrounds, crisp `1px`–`2px` borders.
3. **Security & Secrets Hygiene:** Asset-fetching scripts read `.env` locally at build/prep time, cache sanitized public-ready media/screenshots into gitignored `apps/video/public/captured/`, and never log, embed, or commit credentials, JWTs, or private emails.
4. **Universal Codec Compatibility:** Rendered `.mp4` files must use `H.264` (`-pix_fmt yuv420p`, `-profile:v high`, `60fps` CFR) + `AAC` `48kHz` audio (`-movflags +faststart`) for QuickTime, YouTube, TikTok, and mobile browsers.

---

## 4. Approaches Considered

### Approach 1: Hybrid — Remotion Motion Studio + Live `feedi.quizken.com` Captures & DB Media *(Selected)*
Build `apps/video` in Remotion combining native 60fps 3D vector React UI scenes (wrapping real 1080p video pulled from `khanh`'s Appwrite storage) with real Playwright HiDPI browser captures from https://feedi.quizken.com (`/landing`, `/pricing`, workspace).
- **Pros:** Razor-sharp vector typography & UI at 250% 3D camera zoom; frame-exact beat/SFX sync; instant `en` → `vi` text swap via props; authentic proof of live `feedi.quizken.com` deployment; interactive timeline preview via Remotion Studio.
- **Cons:** Requires building focused motion-ready UI scene components in `apps/video`.

### Approach 2: Playwright Automated Screen-Recording First + Title Wrapper
Record full browser sessions on https://feedi.quizken.com as `.webm` clips and stitch title cards between them with Remotion/FFmpeg.
- **Pros:** Less custom React UI scene code.
- **Cons:** Blurry pixels when zooming in; vulnerable to live network jitter/loading spinners; hard-bakes English UI strings into raster video frames, making later Vietnamese adaptation inconsistent.

### Approach 3: 100% Synthetic Abstract Motion Graphics (Zero Live Site / Real Asset Proof)
Recreate only abstract Dribbble-style cards without capturing https://feedi.quizken.com or real workspace media.
- **Pros:** Zero external asset prep.
- **Cons:** Looks like vaporware/concept art rather than a shipped, live platform at `feedi.quizken.com`.

**Decision:** User selected **Approach 1 (Hybrid)**, authorizing read-only use of existing `admin`/`khanh` videos in the database/storage (or creating a dedicated demo DB account if needed for live browser capture).

---

## 5. Storyboard, Beat Grid & Creative Architecture

### Musical Grid (Builder Call)
- **Tempo:** `120 BPM` (`1 beat = 0.5s = 30 frames @ 60fps`, `1 bar = 2.0s = 120 frames`).
- Every scene cut, kinetic word slam, cursor click, and badge pop lands on exact quarter-note (`15f` / `30f`) or bar (`120f`) boundaries.

### 7-Act Master Timeline (`16:9`, `66s` / `33 bars` / `3960 frames`)

| Act | Time (`Frames`) | Visual & Motion Choreography (After Effects Style) | On-Screen English Copy (`en.ts`) | Audio / SFX Cues |
| :--- | :--- | :--- | :--- | :--- |
| **1. Hook & Per-Seat Pain** | `0:00–0:08` (`0–480f`) | Dark ink grid (`#11130f`). Kinetic slam: `"$25 / SEAT / MONTH?"`. Seat counters multiply rapidly (`5 Editors + 20 Clients = $625/mo`) with red warning shake, then shatter via whip-pan flash into Lime `F` logo + `"MEET FEEDI."` | `STILL PAYING PER SEAT?` → `$625/MO JUST TO LEAVE COMMENTS?` → `MEET FEEDI.` / `No per-seat pricing. Ever.` | Sub-bass impact, rapid counter ticks, glass/glitch cut, crisp lime synth drop |
| **2. Live Proof (`feedi.quizken.com`)** | `0:08–0:16` (`480–960f`) | 3D perspective browser window (`rotateX(14deg) rotateY(-12deg)`) glides over `#f3f3ed` paper dot-grid showing real HiDPI capture of `https://feedi.quizken.com/landing`. Camera zooms into glowing URL bar `feedi.quizken.com` + rotating role pill (`Video Editors` → `Colorists` → `Post Houses`). | `LIVE IN PRODUCTION` · `feedi.quizken.com` · `Frame-accurate review for modern post teams.` | Airy 3D whoosh, URL lock click, upbeat 120 BPM bassline kicks in |
| **3. Frame-Accurate Player & Vector Annotation** | `0:16–0:28` (`960–1680f`) | Camera dives inside the Review Workspace playing real 1080p24 `Peaceful Valley` cut. `J` `K` `L` mechanical keycap HUD flashes; timecode locks at `00:00:04:18 | FRAME 114`. Spring cursor selects Lime Brush & Arrow, draws smooth SVG circle + arrow on frame, types `@editor Lift shadows +0.5 stop`, yellow marker pops on waveform (`ZERO-F5 REALTIME`). | `01 / FRAME-ACCURATE SMPTE` · `J · K · L NLE SCRUBBING` · `VECTOR FRAME ANNOTATIONS` · `INSTANT WEBSOCKET SYNC` | Mechanical `J/K/L` key clicks, felt-brush stroke sound, comment send pop |
| **4. Version Stack & Dual Compare** | `0:28–0:38` (`1680–2280f`) | `V2_COLOR_GRADED.MP4` card snaps onto `V1_FLAT_LOG.MP4` → Neo-brutalist badge `V2 · 2 VERSIONS`. Transitions into **Dual Synchronized Compare**: vertical Lime **Wipe Slider** sweeps across Flat Log V1 (left) vs Rich Color-Graded V2 (right) with `0.00s DRIFT` telemetry HUD. | `02 / VERSION STACKS` · `SIDE-BY-SIDE & WIPE COMPARE` · `100% FRAME-LOCKED PLAYBACK` | Magnetic card snap, smooth hydraulic wipe sweep, beat Accent |
| **5. Zero-Login Share & NLE Export** | `0:38–0:48` (`2280–2880f`) | Split choreography: Editor clicks `Share Link` (`Passphrase + 7-Day Expiry`) → Client Incognito card (`0 LOGINS REQUIRED`) unlocks & clicks green `Approve` → Editor's Notification Bell rings, Kanban card slides to `APPROVED`, and `Export Markers → DaVinci Resolve (.EDL) / Premiere (.XML)` toast fires. | `03 / ZERO-LOGIN CLIENT LINKS` · `ONE-CLICK APPROVALS` · `DIRECT DAVINCI & PREMIERE MARKERS` | Copy-link blip, unlock click, bright approval chime, Kanban slide |
| **6. 2.5D Isometric Architecture & Pricing** | `0:48–0:57` (`2880–3420f`) | Dark `#11130f` grid: 2.5D isometric topology (`rotateX(42deg) rotateZ(-20deg)`) lights up 6 chassis nodes (`Next.js 16`, `FastAPI`, `PostgreSQL`, `Valkey`, `RabbitMQ + FFmpeg`, `Appwrite / S3` + `Cloudflare Tunnel`) with animated `#d8ff43` data beams; quick flip to real `/pricing` card (`$0 Free · $5/mo Pro · Unlimited Seats`). | `SELF-HOSTED OR CLOUD` · `ZERO INBOUND PORTS` · `$0 FREE FOREVER · $5/MO PRO · UNLIMITED SEATS` | Electronic telemetry pulses, isometric node power-up riser |
| **7. Kinetic Finale & CTA** | `0:57–1:06` (`3420–3960f`) | Rapid 4-beat flash cut of the 4 hero moments → settles on signature Neo-brutalist Paper + Lime lockup: `feedi` badge, `"Stop paying per reviewer."`, primary pill `feedi.quizken.com`, secondary badge `100% Open Source · Apache 2.0`. Clean tail reverb fade-out. | `STOP PAYING PER REVIEWER.` · `Try live → feedi.quizken.com` · `Open Source · Apache 2.0` | Four rapid drum hits, final warm chord + sub-bass resolve |

### Vertical Adaptation (`9:16`, `44s` / `22 bars` / `2640 frames` — Builder Call)
- Reuses the same 7 scene components via a `layout="portrait"` prop (`1080x1920`):
  - Top 25%: Kinetic headline & category pill in safe zone (above TikTok/Shorts UI overlays, below top status bar).
  - Middle 55%: Focused zoomed-in interactive stage (player viewport, wipe slider, isometric cube, or browser card).
  - Bottom 20%: Telemetry badges / keycaps / URL callout (`feedi.quizken.com`) kept above the bottom `220px` social caption overlay zone.
- Tightens Act 2–6 durations by ~30% (`44s` total) for maximum short-form completion rate.

---

## 6. Package & Technical Design (`apps/video`)

### Directory Layout (All files `< 380` lines)
- `apps/video/package.json` — `@feedio/video` scripts: `dev` (Remotion Studio), `prep:assets`, `prep:audio`, `render:en:16x9`, `render:en:9x16`, `render:all`, `test`, `typecheck`.
- `apps/video/scripts/fetch_live_assets.py` — Read-only asset & screenshot pipeline:
  1. Resolves Appwrite `file_id` via `appwrite_storage.py` convention (`pr_<media_uuid_hex>` / `rw_<media_uuid_hex>`, e.g., `pr_d50055908a48408682e7cb895b4bd33b` for `Peaceful_Valley_Rolling_Apr_10.mp4`) from `feedi-storage` into `apps/video/public/captured/hero_valley_v2.mp4`, and generates a desaturated flat-log companion `hero_valley_v1_log.mp4` via FFmpeg for authentic V1 vs V2 color compare (falls back to a procedural 1080p cinematic test reel if offline).
  2. Captures crisp `2x` HiDPI PNGs of `https://feedi.quizken.com/landing`, `https://feedi.quizken.com/pricing`, and (via locally signed read-only session cookie or dedicated `demo-viewer` user if reachable) the live `/app/...` project/review screen.
- `apps/video/scripts/generate_audio.py` — Deterministic Python `numpy`/`wave` synthesizer exporting `apps/video/public/audio/soundtrack_16x9.wav` and `soundtrack_9x16.wav` with 120 BPM kick/snare/hat/bass + frame-accurate SFX cues exported from a shared `beat_cues.json`.
- `apps/video/src/copy/{types.ts,en.ts,index.ts}` — Typed `VideoCopy` contract (`locale: "en" | "vi"`) holding every headline, badge, comment text, and CTA.
- `apps/video/src/theme/tokens.ts` — Shared design tokens mirroring `apps/web/src/app/globals.css` + spring presets (`snappy`, `camera`, `slam`, `wipe`).
- `apps/video/src/components/` — Reusable motion primitives (`CameraRig3D.tsx`, `KineticTitle.tsx`, `BrowserFrame.tsx`, `AnimatedCursor.tsx`, `KeycapHud.tsx`).
- `apps/video/src/scenes/` — One focused file per Act (`Act1Hook.tsx` through `Act7Outro.tsx`).
- `apps/video/src/Root.tsx` — Registers `FeediLaunch-16x9-EN` (`1920x1080`, `60fps`, `3960f`) and `FeediLaunch-9x16-EN` (`1080x1920`, `60fps`, `2640f`) with Zod-validated props (`locale`, `layout`).
- `apps/video/out/` (gitignored) — Output directory for final `.mp4` deliverables.

### Verification & Quality Gates
1. Unit tests (`vitest`) verifying frame budget totals, zero overlapping/gap frames across acts, complete `en` copy schema validation, SMPTE timecode math, and responsive safe-zone bounds.
2. Scoped line-count check across `apps/video` and `docs/superpowers` (`< 380` lines per file, 0 errors and 0 warnings), leaving legacy files in `apps/web` and `apps/backend` untouched.
3. End-to-end MP4 render verification via `ffprobe` confirming exact resolution (`1920x1080` & `1080x1920`), `60/1` fps, `h264` (`yuv420p`), non-silent `aac` audio stream, and visual frame inspection at key timestamps across all 7 acts.
