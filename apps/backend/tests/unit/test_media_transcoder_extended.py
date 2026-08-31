import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

import pytest

from feedio.modules.media.application.commands.process_media_transcode import ProcessMediaTranscode
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.infrastructure.filmstrip_generator import FilmstripGenerator
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder
from feedio.shared.infrastructure.persistence import utc_now
from tests.media_fakes import InMemoryMediaRepository, InMemoryStorageService


class FakeValkey:
    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.data[key] = value

    async def get(self, key: str) -> str | None:
        return self.data.get(key)


@pytest.mark.asyncio
async def test_filmstrip_generator_builds_valid_vtt() -> None:
    generator = FilmstripGenerator(frame_width=160, frame_height=90)
    with TemporaryDirectory() as temp_dir_str:
        output_dir = Path(temp_dir_str)
        dummy_file = output_dir / "dummy.mp4"
        dummy_file.write_bytes(b"dummy")

        result = await generator.generate(
            file_path=dummy_file,
            output_dir=output_dir,
            duration_seconds=10.0,
            target_frames=5,
        )

        assert result.vtt_path is not None
        assert result.vtt_path.exists()
        vtt_text = result.vtt_path.read_text(encoding="utf-8")
        assert "WEBVTT" in vtt_text
        assert "filmstrip.jpg#xywh=" in vtt_text
        assert result.num_frames > 0
        assert result.frame_width == 160
        assert result.frame_height == 90


@pytest.mark.asyncio
async def test_transcoder_reports_progress_and_saves_keys() -> None:
    storage = InMemoryStorageService()
    repo = InMemoryMediaRepository()
    valkey = FakeValkey()

    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Sample Cut",
        filename="sample.mp4",
        file_size_bytes=500_000,
        mime_type="video/mp4",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/sample.mp4",
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await repo.create(media)
    await storage.upload_bytes(media.storage_key, b"fake-mp4-stream")

    transcoder = FFmpegTranscoder(storage)
    command = ProcessMediaTranscode(
        repository=repo,
        transcoder=transcoder,
        valkey_client=valkey,
    )

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=media.storage_key,
        filename=media.filename,
        mime_type=media.mime_type,
    )

    assert result.status == "ready"
    assert result.waveform_data is not None

    # Check progress recorded in Valkey
    valkey_progress = await valkey.get(f"transcode:progress:{media_id}")
    assert valkey_progress is not None
    data = json.loads(valkey_progress)
    assert data["status"] == "ready"
    assert data["progress_percent"] == 100


@pytest.mark.asyncio
async def test_audio_media_transcode_pipeline() -> None:
    storage = InMemoryStorageService()
    repo = InMemoryMediaRepository()

    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    media = MediaAsset(
        id=media_id,
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=None,
        title="Podcast Track",
        filename="track.wav",
        file_size_bytes=300_000,
        mime_type="audio/wav",
        storage_key=f"organizations/{org_id}/projects/{proj_id}/media/{media_id}/track.wav",
        status="uploading",
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await repo.create(media)
    await storage.upload_bytes(media.storage_key, b"fake-audio-wav-data")

    transcoder = FFmpegTranscoder(storage)
    command = ProcessMediaTranscode(
        repository=repo,
        transcoder=transcoder,
    )

    result = await command.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=media.storage_key,
        filename=media.filename,
        mime_type=media.mime_type,
    )

    assert result.status == "ready"
    assert result.waveform_data is not None
    peaks = json.loads(result.waveform_data)
    assert isinstance(peaks, list)
    assert len(peaks) > 0
