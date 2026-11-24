from __future__ import annotations

import array
import math
import random
import wave
from pathlib import Path

FPS = 60
BPM = 120

LANDSCAPE_DURATIONS = [480, 480, 720, 600, 600, 540, 540]
PORTRAIT_DURATIONS = [330, 300, 480, 420, 420, 360, 330]


def build_cues_from_durations(durations: list[int]) -> list[tuple[int, str]]:
    starts: list[int] = []
    cur = 0
    for d in durations:
        starts.append(cur)
        cur += d
    a1, a2, a3, a4, a5, a6, a7 = starts
    d1, _, d3, d4, d5, d6, _ = durations
    return sorted(
        [
            (a1 + 0, "impact"),
            (a1 + 60, "tick"),
            (a1 + 90, "tick"),
            (a1 + 120, "tick"),
            (a1 + 150, "tick"),
            (a1 + int(d1 * 0.56), "whoosh"),
            (a1 + int(d1 * 0.62), "impact"),
            (a2 + 0, "whoosh"),
            (a2 + 90, "click"),
            (a2 + 180, "pop"),
            (a3 + 0, "whoosh"),
            (a3 + 90, "click"),
            (a3 + 120, "click"),
            (a3 + 150, "click"),
            (a3 + int(d3 * 0.42), "brush"),
            (a3 + int(d3 * 0.68), "pop"),
            (a4 + 0, "whoosh"),
            (a4 + 75, "pop"),
            (a4 + int(d4 * 0.35), "wipe"),
            (a4 + int(d4 * 0.70), "wipe"),
            (a5 + 0, "whoosh"),
            (a5 + 75, "click"),
            (a5 + int(d5 * 0.45), "chime"),
            (a5 + int(d5 * 0.72), "pop"),
            (a6 + 0, "riser"),
            (a6 + 90, "tick"),
            (a6 + 180, "tick"),
            (a6 + int(d6 * 0.62), "whoosh"),
            (a7 + 0, "impact"),
            (a7 + 30, "pop"),
            (a7 + 60, "pop"),
            (a7 + 90, "pop"),
            (a7 + 135, "resolve"),
        ]
    )


def _mix_mono_into_stereo(
    left: array.array[float],
    right: array.array[float],
    clip: list[float],
    start_idx: int,
    gain_l: float,
    gain_r: float,
) -> None:
    total = len(left)
    end = min(total, start_idx + len(clip))
    if start_idx >= total or end <= 0:
        return
    offset = max(0, -start_idx)
    dst_start = max(0, start_idx)
    for i in range(end - dst_start):
        s = clip[offset + i]
        idx = dst_start + i
        left[idx] += s * gain_l
        right[idx] += s * gain_r


def _make_kick(sr: int) -> list[float]:
    n = int(0.32 * sr)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        t = i / sr
        freq = 46.0 + 115.0 * math.exp(-t * 34.0)
        phase += 2.0 * math.pi * freq / sr
        env = math.exp(-t * 10.5)
        click = 0.28 * math.exp(-t * 180.0) * math.sin(2.0 * math.pi * 1600.0 * t)
        out[i] = 0.62 * (math.sin(phase) * env + click)
    return out


def _make_hat(sr: int, length_s: float, amp: float, seed: int) -> list[float]:
    rng = random.Random(seed)
    n = int(length_s * sr)
    out = [0.0] * n
    prev = 0.0
    for i in range(n):
        t = i / sr
        raw = rng.uniform(-1.0, 1.0)
        hp = raw - prev
        prev = raw
        out[i] = hp * amp * math.exp(-t / (length_s * 0.28))
    return out


def _make_snare(sr: int) -> list[float]:
    rng = random.Random(77)
    n = int(0.18 * sr)
    out = [0.0] * n
    for i in range(n):
        t = i / sr
        body = math.sin(2.0 * math.pi * 195.0 * t) * math.exp(-t * 28.0)
        snap = rng.uniform(-1.0, 1.0) * math.exp(-t * 22.0)
        out[i] = 0.34 * (0.45 * body + 0.55 * snap)
    return out


def _make_bass_eighth(sr: int, freq: float) -> list[float]:
    n = int(0.25 * sr)
    out = [0.0] * n
    for i in range(n):
        t = i / sr
        sidechain = 1.0 - 0.65 * math.exp(-t * 22.0)
        env = sidechain * math.exp(-t * 4.5)
        h1 = math.sin(2.0 * math.pi * freq * t)
        h2 = 0.45 * math.sin(2.0 * math.pi * freq * 2.0 * t)
        h3 = 0.20 * math.sin(2.0 * math.pi * freq * 3.0 * t)
        out[i] = 0.34 * env * (h1 + h2 + h3)
    return out


def _make_chord_stab(sr: int, freqs: tuple[float, ...], dur_s: float = 0.65) -> list[float]:
    n = int(dur_s * sr)
    out = [0.0] * n
    for i in range(n):
        t = i / sr
        attack = min(1.0, t / 0.015)
        env = attack * math.exp(-t * 3.8)
        val = sum(math.sin(2.0 * math.pi * f * t) for f in freqs) / len(freqs)
        out[i] = 0.24 * env * val
    return out


def _make_sfx(kind: str, sr: int) -> tuple[list[float], float, float]:
    rng = random.Random(hash(kind) & 0xFFFF)
    if kind == "impact":
        n = int(0.55 * sr)
        ph = 0.0
        buf = []
        for i in range(n):
            t = i / sr
            ph += 2.0 * math.pi * (38.0 + 140.0 * math.exp(-t * 22.0)) / sr
            boom = math.sin(ph) * math.exp(-t * 5.5)
            transient = rng.uniform(-1.0, 1.0) * math.exp(-t * 60.0) * 0.45
            buf.append(0.58 * (boom + transient))
        return buf, 1.0, 1.0
    if kind == "tick":
        n = int(0.045 * sr)
        return [
            0.35 * math.sin(2.0 * math.pi * 2450.0 * (i / sr)) * math.exp(-(i / sr) * 95.0)
            for i in range(n)
        ], 0.9, 1.0
    if kind == "click":
        n = int(0.055 * sr)
        return [
            0.40
            * (
                math.sin(2.0 * math.pi * 1850.0 * (i / sr))
                + 0.6 * math.sin(2.0 * math.pi * 4100.0 * (i / sr))
            )
            * math.exp(-(i / sr) * 85.0)
            for i in range(n)
        ], 1.0, 0.9
    if kind == "pop":
        n = int(0.09 * sr)
        ph = 0.0
        buf = []
        for i in range(n):
            t = i / sr
            ph += 2.0 * math.pi * (480.0 + 680.0 * (t / 0.09)) / sr
            buf.append(0.38 * math.sin(ph) * math.exp(-t * 32.0))
        return buf, 0.95, 1.0
    if kind in ("whoosh", "brush", "wipe"):
        dur = 0.30 if kind != "brush" else 0.26
        n = int(dur * sr)
        buf = []
        state = 0.0
        for i in range(n):
            t = i / sr
            env = math.sin(math.pi * (t / dur)) ** 1.4
            alpha = 0.08 + 0.35 * (t / dur)
            state = state + alpha * (rng.uniform(-1.0, 1.0) - state)
            tone = 0.25 * math.sin(2.0 * math.pi * (280.0 + 900.0 * (t / dur)) * t)
            buf.append(0.42 * env * (state + tone))
        return buf, (0.85 if kind == "whoosh" else 1.0), (1.0 if kind == "whoosh" else 0.85)
    if kind == "chime":
        n = int(0.55 * sr)
        buf = []
        for i in range(n):
            t = i / sr
            n1 = math.sin(2.0 * math.pi * 1046.5 * t) * math.exp(-t * 6.0)
            n2 = (
                math.sin(2.0 * math.pi * 1567.98 * (t - 0.07)) * math.exp(-(t - 0.07) * 5.0)
                if t >= 0.07
                else 0.0
            )
            buf.append(0.34 * (n1 + n2))
        return buf, 0.95, 1.0
    if kind == "riser":
        dur = 0.95
        n = int(dur * sr)
        ph = 0.0
        buf = []
        for i in range(n):
            t = i / sr
            prog = t / dur
            ph += 2.0 * math.pi * (220.0 + 880.0 * (prog**2)) / sr
            buf.append(0.32 * (prog**1.5) * math.sin(ph))
        return buf, 0.9, 1.0
    # resolve
    dur = 2.2
    n = int(dur * sr)
    chord = (174.61, 261.63, 311.13, 392.00, 523.25)
    buf = []
    for i in range(n):
        t = i / sr
        env = min(1.0, t / 0.03) * math.exp(-t * 1.45)
        buf.append(0.42 * env * sum(math.sin(2.0 * math.pi * f * t) for f in chord) / len(chord))
    return buf, 1.0, 1.0


def synthesize_master_track(
    duration_sec: float,
    cues: list[tuple[int, str]],
    out_wav: Path,
    sample_rate: int = 48000,
) -> dict[str, float]:
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    total_frames = int(round(duration_sec * sample_rate))
    left = array.array("f", [0.0]) * total_frames
    right = array.array("f", [0.0]) * total_frames

    kick = _make_kick(sample_rate)
    snare = _make_snare(sample_rate)
    hat_closed = _make_hat(sample_rate, 0.055, 0.14, 11)
    hat_open = _make_hat(sample_rate, 0.14, 0.18, 29)
    roots = [43.65, 34.65, 51.91, 38.89]  # F1, Db1, Ab1, Eb1
    bass_clips = [_make_bass_eighth(sample_rate, r) for r in roots]
    chords = [
        _make_chord_stab(sample_rate, (174.61, 207.65, 261.63, 311.13)),
        _make_chord_stab(sample_rate, (138.59, 174.61, 207.65, 261.63)),
        _make_chord_stab(sample_rate, (207.65, 261.63, 311.13, 392.00)),
        _make_chord_stab(sample_rate, (155.56, 196.00, 233.08, 311.13)),
    ]

    beat_samples = int(0.5 * sample_rate)
    num_beats = int(duration_sec / 0.5)
    tail_cutoff = max(0, num_beats - 2)
    for b in range(tail_cutoff):
        pos = b * beat_samples
        bar_idx = (b // 4) % 4
        _mix_mono_into_stereo(left, right, kick, pos, 1.0, 1.0)
        if b % 2 == 1:
            _mix_mono_into_stereo(left, right, snare, pos, 0.95, 1.0)
        if b % 4 == 0:
            _mix_mono_into_stereo(left, right, chords[bar_idx], pos, 0.85, 1.05)
        _mix_mono_into_stereo(left, right, bass_clips[bar_idx], pos, 1.0, 1.0)
        _mix_mono_into_stereo(left, right, bass_clips[bar_idx], pos + beat_samples // 2, 0.9, 0.9)
        for sixteenth in range(4):
            hpos = pos + (sixteenth * beat_samples) // 4
            clip = hat_open if sixteenth == 2 else hat_closed
            pan_l = 0.75 if sixteenth % 2 == 0 else 1.0
            pan_r = 1.0 if sixteenth % 2 == 0 else 0.75
            _mix_mono_into_stereo(left, right, clip, hpos, pan_l, pan_r)

    sfx_cache: dict[str, tuple[list[float], float, float]] = {}
    for frame_num, kind in cues:
        if kind not in sfx_cache:
            sfx_cache[kind] = _make_sfx(kind, sample_rate)
        sfx_buf, gl, gr = sfx_cache[kind]
        start_sample = int((frame_num / FPS) * sample_rate)
        _mix_mono_into_stereo(left, right, sfx_buf, start_sample, gl, gr)

    fade_samples = min(int(0.8 * sample_rate), total_frames // 4)
    for i in range(fade_samples):
        gain = i / max(1, fade_samples)
        idx = total_frames - 1 - i
        left[idx] *= gain
        right[idx] *= gain

    raw_peak = 1e-9
    for i in range(total_frames):
        al = abs(left[i])
        ar = abs(right[i])
        if al > raw_peak:
            raw_peak = al
        if ar > raw_peak:
            raw_peak = ar

    norm_gain = 0.88 / raw_peak if raw_peak > 0.88 else 1.0
    pcm = array.array("h", [0]) * (total_frames * 2)
    sum_sq = 0.0
    final_peak = 0.0
    for i in range(total_frames):
        lv = math.tanh(left[i] * norm_gain * 1.12) * 0.90
        rv = math.tanh(right[i] * norm_gain * 1.12) * 0.90
        al, ar = abs(lv), abs(rv)
        if al > final_peak:
            final_peak = al
        if ar > final_peak:
            final_peak = ar
        sum_sq += 0.5 * (lv * lv + rv * rv)
        pcm[2 * i] = int(lv * 32767.0)
        pcm[2 * i + 1] = int(rv * 32767.0)

    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())

    rms = math.sqrt(sum_sq / max(1, total_frames))
    return {"duration_sec": total_frames / sample_rate, "peak": final_peak, "rms": rms}


def main() -> None:
    audio_dir = Path(__file__).resolve().parents[1] / "public" / "audio"
    s16 = synthesize_master_track(
        sum(LANDSCAPE_DURATIONS) / FPS,
        build_cues_from_durations(LANDSCAPE_DURATIONS),
        audio_dir / "soundtrack_16x9.wav",
    )
    s9 = synthesize_master_track(
        sum(PORTRAIT_DURATIONS) / FPS,
        build_cues_from_durations(PORTRAIT_DURATIONS),
        audio_dir / "soundtrack_9x16.wav",
    )
    print(f"[audio:16x9] {s16}")
    print(f"[audio:9x16] {s9}")


if __name__ == "__main__":
    main()
