from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from verify_renders import normalize_mp4_for_broadcast, verify_mp4  # noqa: E402


def test_verify_mp4_rejects_wrong_dimensions_or_missing_audio(tmp_path: Path) -> None:
    silent_mp4 = tmp_path / "bad.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=640x360:r=30:d=1",
            "-pix_fmt",
            "yuv420p",
            str(silent_mp4),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    with pytest.raises(AssertionError):
        verify_mp4(silent_mp4, width=1920, height=1080, duration_sec=66.0)


def test_verify_mp4_accepts_valid_h264_yuv420p_60fps_with_aac_audio(tmp_path: Path) -> None:
    good_mp4 = tmp_path / "good.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=1920x1080:r=60:d=2",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000:duration=2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(good_mp4),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    verify_mp4(good_mp4, width=1920, height=1080, duration_sec=2.0)


def test_normalize_mp4_converts_yuvj420p_to_strict_yuv420p(tmp_path: Path) -> None:
    src = tmp_path / "fullrange.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=white:s=1920x1080:r=60:d=1",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000:duration=1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuvj420p",
            "-c:a",
            "aac",
            str(src),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    normalize_mp4_for_broadcast(src)
    verify_mp4(src, width=1920, height=1080, duration_sec=1.0)
