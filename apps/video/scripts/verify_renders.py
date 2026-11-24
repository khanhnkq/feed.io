from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def normalize_mp4_for_broadcast(path: Path) -> None:
    assert path.exists(), f"Missing MP4 to normalize: {path}"
    tmp_out = path.with_suffix(".broadcast_tmp.mp4")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(path),
            "-vf",
            "scale=out_range=tv,format=yuv420p",
            "-color_range",
            "tv",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-profile:v",
            "high",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(tmp_out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    tmp_out.replace(path)


def verify_mp4(path: Path, width: int, height: int, duration_sec: float) -> dict[str, object]:
    assert path.exists(), f"Missing MP4 file: {path}"
    min_bytes = max(8_192, int(duration_sec * 4_096))
    assert path.stat().st_size > min_bytes, f"MP4 too small: {path}"

    proc = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate:format=duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(proc.stdout)
    streams = payload.get("streams", [])
    v_streams = [s for s in streams if s.get("codec_type") == "video"]
    a_streams = [s for s in streams if s.get("codec_type") == "audio"]

    assert len(v_streams) == 1, f"Expected 1 video stream in {path}, got {len(v_streams)}"
    assert len(a_streams) >= 1, f"Missing audio stream in {path}"

    vs = v_streams[0]
    assert vs.get("codec_name") == "h264", f"Unexpected video codec: {vs.get('codec_name')}"
    assert vs.get("pix_fmt") == "yuv420p", f"Unexpected pix_fmt: {vs.get('pix_fmt')}"
    assert (vs.get("width"), vs.get("height")) == (width, height), (
        f"Expected {width}x{height}, got {vs.get('width')}x{vs.get('height')}"
    )
    assert vs.get("r_frame_rate") in ("60/1", "60000/1000"), f"Unexpected fps: {vs.get('r_frame_rate')}"

    ast = a_streams[0]
    assert ast.get("codec_name") == "aac", f"Unexpected audio codec: {ast.get('codec_name')}"

    actual_dur = float(payload.get("format", {}).get("duration", 0.0))
    assert abs(actual_dur - duration_sec) <= 0.35, (
        f"Expected duration ~{duration_sec}s, got {actual_dur}s"
    )
    return {
        "file": path.name,
        "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
        "duration_sec": round(actual_dur, 2),
        "resolution": f"{width}x{height}",
        "fps": vs.get("r_frame_rate"),
    }


def main() -> None:
    video_root = Path(__file__).resolve().parents[1]
    if len(sys.argv) == 3 and sys.argv[1] == "--normalize":
        target = Path(sys.argv[2])
        if not target.is_absolute():
            target = video_root / target
        normalize_mp4_for_broadcast(target)
        print(f"[normalized] {target.name}")
        return

    out_dir = video_root / "out"
    r16 = verify_mp4(out_dir / "feedi-launch-en-16x9.mp4", 1920, 1080, 66.0)
    r9 = verify_mp4(out_dir / "feedi-launch-en-9x16.mp4", 1080, 1920, 44.0)
    print(f"[verified:16x9] {r16}")
    print(f"[verified:9x16] {r9}")


if __name__ == "__main__":
    main()
