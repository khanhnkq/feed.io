from __future__ import annotations

import os
import subprocess
from collections.abc import Mapping
from pathlib import Path

import httpx
from PIL import Image, ImageDraw

HERO_MEDIA_UUID = "d5005590-8a48-4086-82e7-cb895b4bd33b"
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def media_uuid_to_appwrite_ids(media_uuid: str) -> tuple[str, str]:
    clean_hex = media_uuid.strip().replace("-", "").lower()
    if len(clean_hex) != 32:
        raise ValueError(f"Invalid media UUID: {media_uuid}")
    return f"pr_{clean_hex}", f"rw_{clean_hex}"


def load_dotenv_file(dotenv_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not dotenv_path.exists():
        return values
    for raw in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def _download_appwrite_video(out_raw: Path, env: Mapping[str, str]) -> bool:
    endpoint = (
        env.get("FEEDIO_APPWRITE_ENDPOINT")
        or env.get("APPWRITE_ENDPOINT")
        or "https://fra.cloud.appwrite.io/v1"
    ).rstrip("/")
    project_id = env.get("FEEDIO_APPWRITE_PROJECT_ID") or env.get("APPWRITE_PROJECT_ID") or ""
    bucket_id = env.get("FEEDIO_APPWRITE_BUCKET_ID") or env.get("APPWRITE_BUCKET_ID") or ""
    api_key = env.get("FEEDIO_APPWRITE_API_KEY") or env.get("APPWRITE_API_KEY") or ""
    if not (project_id and bucket_id and api_key):
        return False

    headers = {"X-Appwrite-Project": project_id, "X-Appwrite-Key": api_key}
    for file_id in media_uuid_to_appwrite_ids(HERO_MEDIA_UUID):
        url = f"{endpoint}/storage/buckets/{bucket_id}/files/{file_id}/download"
        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 16_384:
                    out_raw.write_bytes(resp.content)
                    return True
        except httpx.HTTPError:
            continue
    return False


def _generate_fallback_video(target: Path, duration_sec: int = 8) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"testsrc2=size=1920x1080:rate=24:duration={duration_sec}",
            "-vf",
            "hue=h=85:s=1.15,boxblur=1:1",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-pix_fmt",
            "yuv420p",
            str(target),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _normalize_v2_and_build_v1_log(source: Path, v2_out: Path, v1_log_out: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(v2_out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(v2_out),
            "-vf",
            "eq=saturation=0.38:contrast=0.78:brightness=0.06,colorbalance=rs=-0.04:bs=0.04",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(v1_log_out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def has_rendered_hero_content(png_path: Path) -> bool:
    if not png_path.exists() or png_path.stat().st_size < 4_096:
        return False
    with Image.open(png_path) as img:
        small = img.convert("L").resize((160, 100))
        # Check middle hero band (rows 20..85) for dark ink/UI pixels (< 140 luminance)
        dark_pixels = 0
        total = 0
        for y in range(20, 85):
            for x in range(10, 150):
                total += 1
                if small.getpixel((x, y)) < 140:
                    dark_pixels += 1
        return (dark_pixels / max(1, total)) >= 0.03


def _capture_url_chrome(url: str, out_png: Path) -> bool:
    if not Path(CHROME_BIN).exists():
        return False
    try:
        subprocess.run(
            [
                CHROME_BIN,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-prefers-reduced-motion",
                "--window-size=1440,900",
                "--force-device-scale-factor=2",
                "--virtual-time-budget=2800",
                f"--screenshot={out_png}",
                url,
            ],
            check=True,
            timeout=25,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return has_rendered_hero_content(out_png)
    except (subprocess.SubprocessError, OSError):
        return False


def _draw_fallback_card(out_png: Path, title: str, subtitle: str, dark: bool = False) -> None:
    w, h = 2560, 1600
    bg = (17, 19, 15) if dark else (243, 243, 237)
    fg = (243, 243, 237) if dark else (17, 19, 15)
    lime = (216, 255, 67)
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    for x in range(0, w, 64):
        draw.line([(x, 0), (x, h)], fill=(38, 41, 33) if dark else (222, 223, 216), width=1)
    for y in range(0, h, 64):
        draw.line([(0, y), (w, y)], fill=(38, 41, 33) if dark else (222, 223, 216), width=1)
    draw.rounded_rectangle((120, 110, w - 120, h - 110), radius=36, outline=fg, width=4)
    draw.rounded_rectangle((180, 175, 256, 251), radius=16, fill=lime)
    draw.rounded_rectangle((180, 320, 920, 404), radius=20, fill=lime)
    draw.rounded_rectangle((180, 460, w - 260, h - 220), radius=28, fill=(26, 29, 23))
    draw.text((208, 198), "F", fill=(17, 19, 15))
    draw.text((280, 202), f"feedi  |  {title}", fill=fg)
    draw.text((210, 352), subtitle, fill=(17, 19, 15))
    img.save(out_png, format="PNG")


def _build_workspace_card(v2_mp4: Path, out_png: Path) -> None:
    frame_png = out_png.parent / "_tmp_frame.png"
    extracted = False
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                "00:00:02.00",
                "-i",
                str(v2_mp4),
                "-frames:v",
                "1",
                str(frame_png),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        extracted = frame_png.exists()
    except subprocess.SubprocessError:
        extracted = False

    w, h = 2560, 1600
    canvas = Image.new("RGB", (w, h), (17, 19, 15))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, w, 96), fill=(24, 26, 20))
    draw.rounded_rectangle((48, 22, 100, 74), radius=12, fill=(216, 255, 67))
    draw.text((122, 38), "feedi / summer campaign / Peaceful Valley Rolling Apr 10", fill=(243, 243, 237))
    if extracted:
        with Image.open(frame_png) as vf:
            resized = vf.convert("RGB").resize((1720, 968))
            canvas.paste(resized, (64, 144))
        frame_png.unlink(missing_ok=True)
    draw.rounded_rectangle((1824, 144, w - 48, h - 72), radius=24, fill=(26, 29, 23), outline=(46, 49, 40), width=3)
    draw.rounded_rectangle((64, 1152, 1784, h - 72), radius=24, fill=(24, 26, 20), outline=(46, 49, 40), width=3)
    draw.rounded_rectangle((96, 1220, 1180, 1244), radius=10, fill=(216, 255, 67))
    canvas.save(out_png, format="PNG")


def ensure_assets(
    out_dir: Path,
    env: Mapping[str, str],
    allow_network: bool = True,
) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_tmp = out_dir / "_raw_source.mp4"
    v2_out = out_dir / "hero_valley_v2.mp4"
    v1_log_out = out_dir / "hero_valley_v1_log.mp4"
    landing_png = out_dir / "landing_2x.png"
    pricing_png = out_dir / "pricing_2x.png"
    workspace_png = out_dir / "workspace_2x.png"

    if not (v2_out.exists() and v2_out.stat().st_size > 512_000 and v1_log_out.exists()):
        downloaded = allow_network and _download_appwrite_video(raw_tmp, env)
        if not downloaded:
            _generate_fallback_video(raw_tmp, duration_sec=6 if not allow_network else 8)
        _normalize_v2_and_build_v1_log(raw_tmp, v2_out, v1_log_out)
        raw_tmp.unlink(missing_ok=True)

    if not (allow_network and _capture_url_chrome("https://feedi.quizken.com/landing", landing_png)):
        _draw_fallback_card(landing_png, "feedi.quizken.com/landing", "FRAME-ACCURATE REVIEW", dark=False)

    if not (allow_network and _capture_url_chrome("https://feedi.quizken.com/pricing", pricing_png)):
        _draw_fallback_card(pricing_png, "feedi.quizken.com/pricing", "NO PER-SEAT PRICING EVER", dark=False)

    _build_workspace_card(v2_out, workspace_png)

    return {
        "v2": v2_out,
        "v1_log": v1_log_out,
        "landing_png": landing_png,
        "pricing_png": pricing_png,
        "workspace_png": workspace_png,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    merged_env = {**load_dotenv_file(repo_root / ".env"), **os.environ}
    out_dir = Path(__file__).resolve().parents[1] / "public" / "captured"
    result = ensure_assets(out_dir, merged_env, allow_network=True)
    for key, path in result.items():
        print(f"[asset:{key}] {path.name} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
