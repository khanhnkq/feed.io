# Feedi Motion-Graphic Launch Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/video` (`@feedio/video`) to programmatically render broadcast-ready `16:9` (`66s`) and `9:16` (`44s`) 60fps After Effects-style motion-graphic `.mp4` launch videos for Feedi (`feedi.quizken.com`) in English, architected for zero-refactor Vietnamese localization.

**Architecture:** Isolated Remotion 4 + React 19 TypeScript workspace package combining spring-driven 3D CSS perspective UI scenes, real 1080p24 media fetched read-only from Feedi's Appwrite bucket (`feedi-storage`), HiDPI Playwright captures of `https://feedi.quizken.com`, and a deterministic Python 120 BPM electronic beat + frame-locked UI SFX WAV synthesizer.

**Tech Stack:** Remotion `4.0.x` (`remotion`, `@remotion/cli`, `@remotion/renderer`), React `19.1.0`, TypeScript `5.9`, Zod `3.x`, Vitest `3.2`, Python `3.12` (`httpx`, `pillow`, `pyjwt`, stdlib `wave`/`array`), FFmpeg / `ffprobe`.

**Spec:** `docs/superpowers/specs/2026-11-24-feedi-motion-demo-video-design.md`

## Global Constraints

- Scoped File-Length Gate: Every file created in `apps/video/` and `docs/superpowers/` MUST stay `< 380` physical lines (`0` warnings, `0` errors). Do NOT modify `apps/web/`, `apps/backend/`, or `scripts/check-file-lines.sh`.
- Brand Palette (`apps/web/src/app/globals.css`): `ink: #11130f`, `paper: #f3f3ed`, `surface: #fbfbf7`, `line: #dedfd8`, `muted: #73766d`, `lime: #d8ff43`, `orange: #ff9d62`, `cyan: #81dce2`, `lilac: #c9c6ff`; fonts `Inter` (`800/900`, `-0.055em`) + monospace SMPTE timecodes.
- Production Data & Secret Hygiene: Read `.env` locally at asset-prep time only; never mutate existing DB rows/files in Supabase or Appwrite; output captures/audio/MP4s to gitignored paths (`apps/video/public/captured/`, `apps/video/public/audio/`, `apps/video/out/`).
- Output Specs: `FeediLaunch-16x9-EN` (`1920x1080`, `60fps`, `3960` frames / `66.0s`) and `FeediLaunch-9x16-EN` (`1080x1920`, `60fps`, `2640` frames / `44.0s`), encoded as `H.264` (`yuv420p`) + `AAC` `48kHz` stereo (`+faststart`), tempo `120 BPM` (`30f`/beat, `120f`/bar).

## Review Focus

1. Offline / missing `.env` or unreachable Appwrite / `feedi.quizken.com` during asset prep → `fetch_live_assets.py` generates valid `1920x1080` MP4s and `2x` PNG fallbacks instead of failing renders (tested in Task 2).
2. Frame-budget drift, gaps, or overlaps across the 7 Acts in `16:9` (`3960f`) or `9:16` (`2640f`) → `getTimelineSchedule(layout)` partitions `[0, totalFrames)` contiguously on exact beat boundaries (tested in Task 1).
3. Synthesized soundtrack duration mismatch, silence, or digital clipping → `generate_audio.py` emits exact `duration * 48000` stereo 16-bit PCM samples with peak `<= 0.95` and RMS `> 0.02` (tested in Task 3).
4. Portrait (`9:16`) text or HUD badges clipped by TikTok/Shorts/Reels overlays → `getStageBounds("portrait")` constrains copy/HUD within `top >= 140`, `bottom <= 1700`, `paddingX >= 56` on `1080x1920` and tolerates 25% longer localized strings (tested in Task 4).
5. Rendered `.mp4` unplayable in QuickTime / social uploaders due to `yuv444p` or missing audio → `verify_renders.py` asserts `codec_name=h264`, `pix_fmt=yuv420p`, `60/1` fps, and `aac` audio stream via `ffprobe` (tested in Task 7).

---

### Task 1: Workspace Scaffold, Brand Tokens, Beat Schedule & Typed EN Copy

**Files:**
- Modify: `pnpm-workspace.yaml`, `.gitignore`
- Create: `apps/video/package.json`, `apps/video/tsconfig.json`, `apps/video/vitest.config.ts`
- Create: `apps/video/src/theme/tokens.ts`, `apps/video/src/timeline/schedule.ts`
- Create: `apps/video/src/copy/types.ts`, `apps/video/src/copy/en.ts`, `apps/video/src/copy/index.ts`
- Test: `apps/video/src/__tests__/timeline_and_copy.test.ts`

**Interfaces:**
- Consumes: Workspace TypeScript config `@feedio/typescript-config/base.json`.
- Produces:
  - `LayoutMode = "landscape" | "portrait"`, `LocaleCode = "en" | "vi"`, `ActId = "act1" | "act2" | "act3" | "act4" | "act5" | "act6" | "act7"`
  - `TOKENS` (exact hex colors, fonts, shadows) and `SPRINGS` (`snappy`, `camera`, `slam`, `wipe`) in `src/theme/tokens.ts`
  - `getTimelineSchedule(layout: LayoutMode): { fps: 60; bpm: 120; width: number; height: number; totalFrames: number; acts: Record<ActId, { start: number; duration: number }>; sfxCues: Array<{ frame: number; kind: SfxKind }> }`
  - `formatSmpte(frame24: number, fps?: number): string` (`"00:00:04:18"`)
  - `getCopy(locale: LocaleCode): VideoCopy` in `src/copy/index.ts` (Zod-validated `VideoCopySchema` in `src/copy/types.ts`)

- [ ] **Step 1: Register `apps/video` in workspace & scaffold package config**
  Add `- apps/video` (and `@remotion/compositor-*` in `allowBuilds` if prompted) to `pnpm-workspace.yaml`; append `apps/video/public/captured/` and `apps/video/public/audio/` to `.gitignore`. Create `apps/video/package.json` (`@feedio/video`, scripts: `dev`, `test`, `typecheck`, `prep:assets`, `prep:audio`, `render:en:16x9`, `render:en:9x16`, `verify:renders`; deps: `remotion`, `@remotion/cli`, `@remotion/renderer`, `react@^19.1.0`, `react-dom@^19.1.0`, `zod@^3.24.0`, `lucide-react`; devDeps: `vitest@^3.2.0`, `@testing-library/react@^16.3.0`, `jsdom`, `typescript@^5.9.0`), `tsconfig.json`, and `vitest.config.ts`. Run `pnpm install`.

- [ ] **Step 2: Write the failing timeline, SMPTE & copy schema tests**
```ts
describe("timeline & copy contracts", () => {
  it("partitions 16:9 (3960f) and 9:16 (2640f) contiguously on 15f beat grid", () => {
    for (const [mode, total] of [["landscape", 3960], ["portrait", 2640]] as const) {
      const s = getTimelineSchedule(mode);
      expect(s.totalFrames).toBe(total);
      let cursor = 0;
      for (const id of ["act1", "act2", "act3", "act4", "act5", "act6", "act7"] as const) {
        expect(s.acts[id].start).toBe(cursor);
        expect(s.acts[id].duration % 30).toBe(0);
        cursor += s.acts[id].duration;
      }
      expect(cursor).toBe(total);
      expect(s.sfxCues.every((c) => Number.isInteger(c.frame) && c.frame >= 0 && c.frame < total)).toBe(true);
    }
  });
  it("validates English copy against VideoCopySchema and formats 24fps SMPTE", () => {
    expect(() => VideoCopySchema.parse(getCopy("en"))).not.toThrow();
    expect(formatSmpte(114, 24)).toBe("00:00:04:18");
  });
});
```

- [ ] **Step 3: Run test to verify failure**
  Run: `pnpm --filter @feedio/video test` → Expected: FAIL (modules not found).

- [ ] **Step 4: Implement `tokens.ts`, `schedule.ts`, and `copy/{types,en,index}.ts`**
  Pin `landscape` act durations to `[480, 480, 720, 600, 600, 540, 540] = 3960` and `portrait` act durations to `[330, 300, 480, 420, 420, 360, 330] = 2640`, populate `sfxCues` (`impact`, `tick`, `whoosh`, `click`, `brush`, `pop`, `wipe`, `chime`, `riser`, `resolve`), and encode all 7 acts' English copy from Spec Section 5 in `en.ts`.

- [ ] **Step 5: Run tests & typecheck, then commit**
  Run: `pnpm --filter @feedio/video test && pnpm --filter @feedio/video typecheck` → Expected: PASS.
  Commit: `git commit -m "feat(video): scaffold @feedio/video tokens, beat schedule, and EN copy"`

---

### Task 2: Read-Only Live Asset & HiDPI Screenshot Pipeline

**Files:**
- Create: `apps/video/scripts/fetch_live_assets.py`
- Test: `apps/video/scripts/test_fetch_live_assets.py`

**Interfaces:**
- Consumes: Root `.env` (`FEEDIO_APPWRITE_ENDPOINT`, `FEEDIO_APPWRITE_PROJECT_ID`, `FEEDIO_APPWRITE_BUCKET_ID`, `FEEDIO_APPWRITE_API_KEY`, `FEEDIO_AUTH_JWT_SECRET`) in read-only mode; live URLs `https://feedi.quizken.com/landing`, `/pricing`, and `/app/organizations/feedi-8236cafc/projects/e4c9c234-7eca-4d1f-a5df-42bc3435e752`.
- Produces:
  - `media_uuid_to_appwrite_ids(media_uuid: str) -> tuple[str, str]` returning `("pr_<hex>", "rw_<hex>")`
  - `ensure_assets(out_dir: Path, env: Mapping[str, str], allow_network: bool = True) -> dict[str, Path]` writing `hero_valley_v2.mp4` (`1920x1080`, `24fps`), `hero_valley_v1_log.mp4` (desaturated flat-log grade via FFmpeg `eq=saturation=0.45:contrast=0.82:brightness=0.04`), `landing_2x.png`, `pricing_2x.png`, and `workspace_2x.png`.

- [ ] **Step 1: Write the failing Python asset pipeline tests (including offline fallback)**
```python
def test_media_uuid_mapping_matches_backend():
    assert media_uuid_to_appwrite_ids("d5005590-8a48-4086-82e7-cb895b4bd33b") == (
        "pr_d50055908a48408682e7cb895b4bd33b",
        "rw_d50055908a48408682e7cb895b4bd33b",
    )

def test_offline_fallback_generates_valid_1080p_videos_and_pngs(tmp_path):
    outputs = ensure_assets(tmp_path, env={}, allow_network=False)
    assert set(outputs.keys()) == {"v2", "v1_log", "landing_png", "pricing_png", "workspace_png"}
    for path in outputs.values():
        assert path.exists() and path.stat().st_size > 4096
```

- [ ] **Step 2: Run test to verify failure**
  Run: `uv run --directory apps/backend pytest ../video/scripts/test_fetch_live_assets.py -v` → Expected: FAIL.

- [ ] **Step 3: Implement `fetch_live_assets.py` (zero extra Python installs — uses `httpx`, `pillow`, `pyjwt` already in `apps/backend`)**
  Fetch `pr_d50055908a48408682e7cb895b4bd33b` via Appwrite REST `httpx` (fallback `rw_...`, then FFmpeg `testsrc2=size=1920x1080:rate=24:duration=8` cinematic gradient reel if offline); derive `hero_valley_v1_log.mp4` via FFmpeg filter; capture `2560x1440` HiDPI screenshots of `/landing`, `/pricing`, and read-only `/app/...` workspace using Remotion's bundled headless browser (`@remotion/renderer` `openBrowser` helper or local Chrome headless), falling back to Pillow-rendered crisp branded UI cards when offline. Never log secret values.

- [ ] **Step 4: Run pytest + execute live asset fetch, then commit**
  Run: `uv run --directory apps/backend pytest ../video/scripts/test_fetch_live_assets.py -v && uv run --directory apps/backend python ../video/scripts/fetch_live_assets.py` → Expected: PASS and files populated in `apps/video/public/captured/`.
  Commit: `git commit -m "feat(video): add read-only Appwrite & live site asset pipeline with offline fallback"`

---

### Task 3: 120 BPM Electronic Soundtrack & Frame-Locked SFX Synthesizer

**Files:**
- Create: `apps/video/scripts/generate_audio.py`
- Test: `apps/video/scripts/test_generate_audio.py`

**Interfaces:**
- Consumes: Beat duration & cue specification mirrored from Task 1 (`landscape`: `66.0s` / `3960f`; `portrait`: `44.0s` / `2640f`, `fps=60`, `bpm=120`).
- Produces:
  - `synthesize_master_track(duration_sec: float, cues: list[ tuple[int, str] ], out_wav: Path, sample_rate: int = 48000) -> dict[str, float]` returning `{"duration_sec": ..., "peak": ..., "rms": ...}`
  - Outputs `apps/video/public/audio/soundtrack_16x9.wav` (`66.0s`) and `apps/video/public/audio/soundtrack_9x16.wav` (`44.0s`).

- [ ] **Step 1: Write the failing WAV duration, peak-headroom & non-silence tests**
```python
def test_synthesizes_exact_48khz_stereo_wav_without_clipping(tmp_path):
    wav_path = tmp_path / "test.wav"
    stats = synthesize_master_track(4.0, [(0, "impact"), (60, "click"), (120, "chime")], wav_path)
    with wave.open(str(wav_path), "rb") as wf:
        assert (wf.getnchannels(), wf.getsampwidth(), wf.getframerate(), wf.getnframes()) == (2, 2, 48000, 192000)
    assert 0.02 < stats["rms"] < stats["peak"] <= 0.95
```

- [ ] **Step 2: Run test to verify failure**
  Run: `uv run --directory apps/backend pytest ../video/scripts/test_generate_audio.py -v` → Expected: FAIL.

- [ ] **Step 3: Implement `generate_audio.py` using Python `math`/`array`/`wave` (or stdlib + `struct`)**
  Synthesize punchy 120 BPM four-on-the-floor kick (`55Hz` pitch-drop sine), warm saw-filtered bassline (`F1`–`G#1`–`C2`), crisp 16th-note noise hi-hats, stereo chord stabs on bar transitions, and distinct procedural SFX (`impact`, `tick`, `whoosh`, `click`, `brush`, `pop`, `wipe`, `chime`, `riser`, `resolve`) mixed at exact `frame / 60.0` offsets with soft-limiter ceiling `0.92`.

- [ ] **Step 4: Run pytest & generate both master WAVs, then commit**
  Run: `uv run --directory apps/backend pytest ../video/scripts/test_generate_audio.py -v && uv run --directory apps/backend python ../video/scripts/generate_audio.py` → Expected: PASS and WAVs written to `apps/video/public/audio/`.
  Commit: `git commit -m "feat(video): add 120 BPM electronic beat and frame-locked SFX synthesizer"`

---

### Task 4: After Effects Motion Primitives & Responsive Safe-Zone Stage

**Files:**
- Create: `apps/video/src/layout/stage.ts`
- Create: `apps/video/src/components/CameraRig3D.tsx`, `apps/video/src/components/KineticTitle.tsx`
- Create: `apps/video/src/components/BrowserFrame.tsx`, `apps/video/src/components/AnimatedCursor.tsx`, `apps/video/src/components/KeycapHud.tsx`
- Test: `apps/video/src/__tests__/stage_and_primitives.test.tsx`

**Interfaces:**
- Consumes: `LayoutMode`, `TOKENS`, `SPRINGS` from Task 1.
- Produces:
  - `getStageBounds(layout: LayoutMode): { width: number; height: number; safeTop: number; safeBottom: number; paddingX: number; stageScale: number; isPortrait: boolean }`
  - `<CameraRig3D keyframes={CameraKeyframe[]} layout={LayoutMode}>{children}</CameraRig3D>` (`perspective(1400px)` + spring-interpolated `rotateX`, `rotateY`, `rotateZ`, `scale`, `translateX/Y`)
  - `<KineticTitle lines={string[]} accentIndex?: number startFrame?: number />`
  - `<BrowserFrame url={string} badge?: string>{children}</BrowserFrame>`
  - `<AnimatedCursor waypoints={CursorWaypoint[]} />` and `<KeycapHud keys={Array<{ label: string; activeAt: number }>} />`

- [ ] **Step 1: Write failing safe-zone geometry & primitive render tests**
```tsx
it("keeps portrait safe bounds clear of TikTok/Shorts top & bottom UI chrome", () => {
  const b = getStageBounds("portrait");
  expect(b.width).toBe(1080);
  expect(b.height).toBe(1920);
  expect(b.safeTop).toBeGreaterThanOrEqual(140);
  expect(b.safeBottom).toBeLessThanOrEqual(1700);
  expect(b.paddingX).toBeGreaterThanOrEqual(56);
});
```

- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm --filter @feedio/video test` → Expected: FAIL.

- [ ] **Step 3: Implement `stage.ts` and the 5 reusable motion components**
  Use Remotion `useCurrentFrame()`, `useVideoConfig()`, `spring()`, and `interpolate({ extrapolateLeft: "clamp", extrapolateRight: "clamp" })` (never CSS transitions/animations, which break Remotion frame determinism). Ensure `KineticTitle` wraps long localized strings cleanly (`maxWidth: width - paddingX * 2`, `textWrap: "balance"`).

- [ ] **Step 4: Run tests & typecheck, then commit**
  Run: `pnpm --filter @feedio/video test && pnpm --filter @feedio/video typecheck` → Expected: PASS.
  Commit: `git commit -m "feat(video): add 3D camera rig, safe-zone stage, and After Effects UI primitives"`

---

### Task 5: Acts 1–4 Choreography (Hook, Live Proof, SMPTE Annotation, Dual Wipe Compare)

**Files:**
- Create: `apps/video/src/scenes/Act1Hook.tsx`, `apps/video/src/scenes/Act2LiveProof.tsx`
- Create: `apps/video/src/scenes/Act3PlayerAnnotate.tsx`, `apps/video/src/scenes/Act4VersionCompare.tsx`
- Test: `apps/video/src/__tests__/acts_1_to_4.test.tsx`

**Interfaces:**
- Consumes: `VideoCopy`, `LayoutMode`, `TOKENS`, `formatSmpte`, Task 4 primitives, `staticFile("captured/...")`.
- Produces: `Act1Hook`, `Act2LiveProof`, `Act3PlayerAnnotate`, `Act4VersionCompare` accepting `SceneProps = { copy: VideoCopy; layout: LayoutMode; durationInFrames: number; previewMode?: boolean }`.

- [ ] **Step 1: Write failing scene render tests across `landscape` and `portrait`**
```tsx
it.each(["landscape", "portrait"] as const)("renders Acts 1-4 cleanly in %s mode", (layout) => {
  const copy = getCopy("en");
  for (const Comp of [Act1Hook, Act2LiveProof, Act3PlayerAnnotate, Act4VersionCompare]) {
    const { container } = render(<Comp copy={copy} layout={layout} durationInFrames={360} previewMode />);
    expect(container.textContent?.length).toBeGreaterThan(10);
  }
});
```

- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm --filter @feedio/video test` → Expected: FAIL.

- [ ] **Step 3: Implement `Act1Hook`, `Act2LiveProof`, `Act3PlayerAnnotate`, and `Act4VersionCompare`**
  - `Act1Hook`: Dark ink grid, escalating seat counter `$25 -> $625/mo` with shake, whip-pan flash to Lime `F` logo + `No per-seat pricing. Ever.`
  - `Act2LiveProof`: 3D tilted `<BrowserFrame url="https://feedi.quizken.com">` displaying `captured/landing_2x.png`, zooming into glowing URL pill & kinetic role badge.
  - `Act3PlayerAnnotate`: Feedi Review Workspace wrapping `<OffthreadVideo src={staticFile("captured/hero_valley_v2.mp4")} />` (or stub frame when `previewMode` in unit tests), `<KeycapHud>` `J/K/L`, locking at `00:00:04:18 | FRAME 114`, animated SVG `strokeDashoffset` circle + arrow annotation in `#d8ff43`, comment bubble + waveform pin pop.
  - `Act4VersionCompare`: Stack snap `V1` + `V2` → split-screen `<OffthreadVideo>` pair (`hero_valley_v1_log.mp4` clipped left vs `hero_valley_v2.mp4` right) driven by spring Wipe Slider + `0.00s DRIFT` HUD.

- [ ] **Step 4: Run tests & typecheck, then commit**
  Run: `pnpm --filter @feedio/video test && pnpm --filter @feedio/video typecheck` → Expected: PASS.
  Commit: `git commit -m "feat(video): implement Acts 1-4 After Effects scene choreography"`

---

### Task 6: Acts 5–7 Choreography (Guest Share & NLE, 2.5D Isometric Architecture, Finale CTA)

**Files:**
- Create: `apps/video/src/scenes/Act5ShareApprove.tsx`, `apps/video/src/scenes/Act6ArchitecturePricing.tsx`, `apps/video/src/scenes/Act7Outro.tsx`
- Test: `apps/video/src/__tests__/acts_5_to_7.test.tsx`

**Interfaces:**
- Consumes: `SceneProps` contract from Task 5, `captured/pricing_2x.png`, `TOKENS`.
- Produces: `Act5ShareApprove`, `Act6ArchitecturePricing`, `Act7Outro` accepting `SceneProps`.

- [ ] **Step 1: Write failing scene render tests for Acts 5–7 (`landscape` & `portrait`)**
```tsx
it.each(["landscape", "portrait"] as const)("renders Acts 5-7 with CTA domain in %s mode", (layout) => {
  const copy = getCopy("en");
  for (const Comp of [Act5ShareApprove, Act6ArchitecturePricing, Act7Outro]) {
    const { container } = render(<Comp copy={copy} layout={layout} durationInFrames={360} previewMode />);
    expect(container.firstChild).not.toBeNull();
  }
  const outro = render(<Act7Outro copy={copy} layout={layout} durationInFrames={330} previewMode />);
  expect(outro.container.textContent).toContain("feedi.quizken.com");
});
```

- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm --filter @feedio/video test` → Expected: FAIL.

- [ ] **Step 3: Implement `Act5ShareApprove`, `Act6ArchitecturePricing`, and `Act7Outro`**
  - `Act5ShareApprove`: Share modal (`Passphrase + 7-Day Expiry`) → Incognito `0 LOGINS REQUIRED` unlock → emerald `APPROVED` stamp + ringing Notification Bell + Kanban card slide + `Export Markers (.EDL / .XML)` toast.
  - `Act6ArchitecturePricing`: 2.5D isometric plane (`rotateX(42deg) rotateZ(-20deg)`) lighting 6 chassis nodes (`Next.js 16`, `FastAPI`, `PostgreSQL`, `Valkey`, `RabbitMQ + FFmpeg`, `Appwrite / S3` + `Cloudflare Tunnel`) with frame-driven SVG `strokeDashoffset` lime beams, then 3D card flip to `captured/pricing_2x.png` callout (`$0 Free · $5/mo Pro · Unlimited Seats`).
  - `Act7Outro`: 4-beat flash montage → Neo-brutalist Paper + Lime lockup (`feedi`, `Stop paying per reviewer.`, `feedi.quizken.com`, `Open Source · Apache 2.0`).

- [ ] **Step 4: Run tests & typecheck, then commit**
  Run: `pnpm --filter @feedio/video test && pnpm --filter @feedio/video typecheck` → Expected: PASS.
  Commit: `git commit -m "feat(video): implement Acts 5-7 share, isometric architecture, and outro scenes"`

---

### Task 7: Remotion Root Compositions, MP4 Render Pipeline & `ffprobe` Verification

**Files:**
- Create: `apps/video/src/Composition.tsx`, `apps/video/src/Root.tsx`, `apps/video/src/index.ts`, `apps/video/remotion.config.ts`
- Create: `apps/video/scripts/verify_renders.py`
- Test: `apps/video/scripts/test_verify_renders.py`

**Interfaces:**
- Consumes: `getTimelineSchedule`, `getCopy`, `Act1Hook`..`Act7Outro`, `soundtrack_16x9.wav`, `soundtrack_9x16.wav`.
- Produces:
  - Remotion compositions `FeediLaunch-16x9-EN` (`1920x1080`, `60fps`, `3960f`) and `FeediLaunch-9x16-EN` (`1080x1920`, `60fps`, `2640f`)
  - Final rendered deliverables: `apps/video/out/feedi-launch-en-16x9.mp4` and `apps/video/out/feedi-launch-en-9x16.mp4`
  - `verify_mp4(path: Path, width: int, height: int, duration_sec: float) -> None` raising `AssertionError` on codec/pix_fmt/fps/audio/duration mismatch.

- [ ] **Step 1: Write failing `verify_renders.py` unit test (rejects missing audio or wrong `pix_fmt`)**
```python
def test_verify_mp4_rejects_wrong_dimensions_or_missing_audio(tmp_path):
    silent_mp4 = tmp_path / "bad.mp4"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=640x360:r=30:d=1", "-pix_fmt", "yuv420p", str(silent_mp4)], check=True)
    with pytest.raises(AssertionError):
        verify_mp4(silent_mp4, width=1920, height=1080, duration_sec=66.0)
```

- [ ] **Step 2: Run test to verify failure**
  Run: `uv run --directory apps/backend pytest ../video/scripts/test_verify_renders.py -v` → Expected: FAIL.

- [ ] **Step 3: Implement `Composition.tsx`, `Root.tsx`, `index.ts`, `remotion.config.ts`, and `verify_renders.py`**
  Sequence Acts 1–7 via `<Series>` inside `FeediLaunchComposition` alongside `<Audio src={staticFile(audioFile)} />`; configure `Config.setVideoImageFormat("jpeg")`, `Config.setPixelFormat("yuv420p")`, `Config.setCodec("h264")` in `remotion.config.ts`; wire `render:en:16x9` and `render:en:9x16` in `apps/video/package.json` with `--codec=h264 --pixel-format=yuv420p --audio-codec=aac`.

- [ ] **Step 4: Render both `.mp4` masters & run full verification + scoped line-count gate**
  Run:
  ```bash
  pnpm --filter @feedio/video test && pnpm --filter @feedio/video typecheck
  pnpm --filter @feedio/video render:en:16x9 && pnpm --filter @feedio/video render:en:9x16
  uv run --directory apps/backend pytest ../video/scripts/ -v
  uv run --directory apps/backend python ../video/scripts/verify_renders.py
  python3 -c 'import pathlib,sys; bad=[f"{p}:{len(p.read_text().splitlines())}" for r in ["apps/video","docs/superpowers"] for p in pathlib.Path(r).rglob("*") if p.is_file() and "node_modules" not in p.parts and p.suffix in {".ts",".tsx",".py",".md",".css"} and len(p.read_text().splitlines())>=380]; assert not bad, bad; print("Line gate OK")'
  ```
  Expected: Both MP4s verified (`1920x1080` `66.0s` & `1080x1920` `44.0s`, `60fps`, `h264`/`yuv420p` + `aac`), sample still frames extracted & visually inspected across all 7 acts, `Line gate OK`.

- [ ] **Step 5: Commit final composition & verification pipeline**
  Commit: `git commit -m "feat(video): wire Remotion compositions, MP4 render scripts, and ffprobe verification"`
