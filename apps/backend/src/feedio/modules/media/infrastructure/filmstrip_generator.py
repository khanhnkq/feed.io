import asyncio
import math
import shutil
from dataclasses import dataclass
from pathlib import Path

import structlog

logger = structlog.get_logger()


@dataclass(frozen=True, slots=True)
class FilmstripResult:
    sprite_image_path: Path | None
    vtt_path: Path | None
    num_frames: int
    frame_width: int
    frame_height: int
    columns: int
    rows: int
    interval_seconds: float


class FilmstripGenerator:
    """Generates tiled video sprite sheets and WebVTT cue files for hover scrubbing."""

    def __init__(self, frame_width: int = 160, frame_height: int = 90) -> None:
        self.frame_width = frame_width
        self.frame_height = frame_height
        self._ffmpeg_available = shutil.which("ffmpeg") is not None

    async def generate(
        self,
        file_path: Path,
        output_dir: Path,
        duration_seconds: float,
        target_frames: int = 25,
    ) -> FilmstripResult:
        output_dir.mkdir(parents=True, exist_ok=True)
        sprite_path = output_dir / "filmstrip.jpg"
        vtt_path = output_dir / "filmstrip.vtt"

        safe_duration = max(1.0, duration_seconds)
        # Determine sampling interval (e.g. at least 1s between frames)
        interval = max(1.0, round(safe_duration / target_frames, 2))
        num_frames = min(target_frames, max(1, int(math.ceil(safe_duration / interval))))
        columns = 5
        rows = int(math.ceil(num_frames / columns))

        if not self._ffmpeg_available:
            # Fallback mock VTT generation
            vtt_content = self._build_vtt_content(
                num_frames=num_frames,
                interval=interval,
                duration=safe_duration,
                columns=columns,
            )
            await asyncio.to_thread(vtt_path.write_text, vtt_content, encoding="utf-8")
            return FilmstripResult(
                sprite_image_path=None,
                vtt_path=vtt_path,
                num_frames=num_frames,
                frame_width=self.frame_width,
                frame_height=self.frame_height,
                columns=columns,
                rows=rows,
                interval_seconds=interval,
            )

        # FFmpeg tile command
        # fps=1/interval samples one frame every `interval` seconds
        filter_str = (
            f"fps=1/{interval},"
            f"scale={self.frame_width}:{self.frame_height}:force_original_aspect_ratio=decrease,"
            f"pad={self.frame_width}:{self.frame_height}:(ow-iw)/2:(oh-ih)/2,"
            f"tile={columns}x{rows}"
        )
        cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "quiet",
            "-i",
            str(file_path),
            "-vf",
            filter_str,
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(sprite_path),
        ]

        try:
            proc = await asyncio.create_subprocess_exec(*cmd)
            await proc.communicate()

            def _check_sprite() -> bool:
                return sprite_path.exists() and sprite_path.stat().st_size > 0

            sprite_ok = await asyncio.to_thread(_check_sprite)
            if not sprite_ok:
                logger.warn("filmstrip_ffmpeg_failed", file=str(file_path))
                sprite_path_result = None
            else:
                sprite_path_result = sprite_path

            # Generate WebVTT
            vtt_content = self._build_vtt_content(
                num_frames=num_frames,
                interval=interval,
                duration=safe_duration,
                columns=columns,
            )
            await asyncio.to_thread(vtt_path.write_text, vtt_content, encoding="utf-8")

            return FilmstripResult(
                sprite_image_path=sprite_path_result,
                vtt_path=vtt_path,
                num_frames=num_frames,
                frame_width=self.frame_width,
                frame_height=self.frame_height,
                columns=columns,
                rows=rows,
                interval_seconds=interval,
            )
        except Exception as exc:
            logger.error("filmstrip_generation_error", error=str(exc))
            return FilmstripResult(
                sprite_image_path=None,
                vtt_path=None,
                num_frames=0,
                frame_width=self.frame_width,
                frame_height=self.frame_height,
                columns=columns,
                rows=rows,
                interval_seconds=interval,
            )

    def _build_vtt_content(
        self,
        num_frames: int,
        interval: float,
        duration: float,
        columns: int,
    ) -> str:
        lines = ["WEBVTT", ""]
        for i in range(num_frames):
            start_sec = i * interval
            end_sec = min(duration, (i + 1) * interval)
            col_idx = i % columns
            row_idx = i // columns
            x = col_idx * self.frame_width
            y = row_idx * self.frame_height

            start_tc = self._format_timestamp(start_sec)
            end_tc = self._format_timestamp(end_sec)

            lines.append(f"{start_tc} --> {end_tc}")
            lines.append(
                f"filmstrip.jpg#xywh={x},{y},{self.frame_width},{self.frame_height}"
            )
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"
