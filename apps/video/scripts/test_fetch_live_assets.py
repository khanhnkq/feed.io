from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_live_assets import (  # noqa: E402
    ensure_assets,
    has_rendered_hero_content,
    media_uuid_to_appwrite_ids,
)


def test_media_uuid_mapping_matches_backend() -> None:
    assert media_uuid_to_appwrite_ids("d5005590-8a48-4086-82e7-cb895b4bd33b") == (
        "pr_d50055908a48408682e7cb895b4bd33b",
        "rw_d50055908a48408682e7cb895b4bd33b",
    )


def test_detects_blank_paper_screenshot_missing_hero_content(tmp_path: Path) -> None:
    from PIL import Image

    blank = tmp_path / "blank.png"
    Image.new("RGB", (800, 500), (243, 243, 237)).save(blank)
    assert has_rendered_hero_content(blank) is False


def test_offline_fallback_generates_valid_1080p_videos_and_pngs(tmp_path: Path) -> None:
    outputs = ensure_assets(tmp_path, env={}, allow_network=False)
    assert set(outputs.keys()) == {"v2", "v1_log", "landing_png", "pricing_png", "workspace_png"}
    for path in outputs.values():
        assert path.exists()
        assert path.stat().st_size > 4096

    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
            str(outputs["v2"]),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    assert probe.stdout.strip() == "1920,1080"
