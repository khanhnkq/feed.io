from __future__ import annotations

import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_audio import synthesize_master_track  # noqa: E402


def test_synthesizes_exact_48khz_stereo_wav_without_clipping(tmp_path: Path) -> None:
    wav_path = tmp_path / "test.wav"
    cues = [(0, "impact"), (60, "click"), (120, "chime"), (180, "whoosh"), (210, "pop")]
    stats = synthesize_master_track(4.0, cues, wav_path)
    with wave.open(str(wav_path), "rb") as wf:
        assert (wf.getnchannels(), wf.getsampwidth(), wf.getframerate(), wf.getnframes()) == (
            2,
            2,
            48000,
            192000,
        )
    assert abs(stats["duration_sec"] - 4.0) < 1e-6
    assert 0.02 < stats["rms"] < stats["peak"] <= 0.95
