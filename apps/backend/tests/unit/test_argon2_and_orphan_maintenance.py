import asyncio
import os
import tempfile
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from feedio.bootstrap.config import Settings
from feedio.entrypoints.maintenance import (
    run_orphan_upload_cleaner,
    run_orphan_upload_cleanup_once,
)
from feedio.modules.identity.infrastructure.passwords import Argon2PasswordManager
from feedio.modules.media.infrastructure.local_media_cache import LocalMediaCache


@pytest.mark.asyncio
async def test_argon2_async_enforces_semaphore_cap_and_keeps_event_loop_responsive() -> None:
    manager = Argon2PasswordManager(max_concurrency=2)
    active = 0
    peak_active = 0

    def _slow_sync_hash(pw: str) -> str:
        nonlocal active, peak_active
        active += 1
        peak_active = max(peak_active, active)
        time.sleep(0.06)
        active -= 1
        return f"hashed:{pw}"

    manager.hash = _slow_sync_hash  # type: ignore[method-assign]

    ticks = 0

    async def _ticker() -> None:
        nonlocal ticks
        for _ in range(5):
            await asyncio.sleep(0.015)
            ticks += 1

    ticker_task = asyncio.create_task(_ticker())
    results = await asyncio.gather(*(manager.hash_async(f"pass-{i}") for i in range(6)))
    await ticker_task

    assert len(results) == 6
    assert peak_active <= 2, f"Expected max concurrency <= 2, got {peak_active}"
    assert ticks >= 4, "Event loop was blocked during concurrent password hashing"


@pytest.mark.asyncio
async def test_argon2_real_async_hash_and_verify_roundtrip() -> None:
    manager = Argon2PasswordManager(max_concurrency=2)
    digest = await manager.hash_async("demo-secret-123")
    assert await manager.verify_async("demo-secret-123", digest) is True
    assert await manager.verify_async("wrong-secret", digest) is False


def test_purge_stale_temp_files_cleans_expired_mp_and_tmp(tmp_path: Path) -> None:
    cache = LocalMediaCache(cache_dir=tmp_path)
    stale_tmp = tmp_path / ".tmp_abandoned123"
    stale_tmp.write_bytes(b"partial")
    fresh_tmp = tmp_path / ".tmp_active456"
    fresh_tmp.write_bytes(b"active")

    mp_stale = Path(tempfile.gettempdir()) / f"feedio_mp_test_stale_{uuid4().hex[:8]}"
    mp_stale.mkdir(parents=True, exist_ok=True)
    (mp_stale / "part_1.bin").write_bytes(b"chunk")

    old_mtime = time.time() - 8000  # > 2h old
    os.utime(stale_tmp, (old_mtime, old_mtime))
    os.utime(mp_stale, (old_mtime, old_mtime))

    removed = cache.purge_stale_temp_files(max_age_seconds=7200)
    assert removed >= 2
    assert not stale_tmp.exists()
    assert not mp_stale.exists()
    assert fresh_tmp.exists()


@pytest.mark.asyncio
async def test_run_orphan_upload_cleaner_executes_2h_cutoff_and_stops(tmp_path: Path) -> None:
    settings = Settings(
        environment="development",
        media_cache_dir=str(tmp_path),
        orphan_cleanup_interval_seconds=60,
        orphan_upload_max_age_hours=2,
        storage_provider="appwrite",
    )

    fake_session = AsyncMock()
    fake_session_ctx = AsyncMock()
    fake_session_ctx.__aenter__.return_value = fake_session

    with (
        patch("feedio.entrypoints.maintenance.session_factory", return_value=fake_session_ctx),
        patch("feedio.entrypoints.maintenance.CleanupOrphanedUploads") as mock_cleaner_cls,
    ):
        mock_instance = MagicMock()
        mock_instance.execute = AsyncMock(return_value=3)
        mock_cleaner_cls.return_value = mock_instance

        stats = await run_orphan_upload_cleanup_once(settings)
        assert stats["cleaned_orphaned_assets"] == 3
        mock_instance.execute.assert_awaited_once_with(older_than_hours=2)
        fake_session.commit.assert_awaited_once()

        # Also test periodic loop cancellation
        stop_event = asyncio.Event()

        async def _stop_soon() -> None:
            await asyncio.sleep(0.03)
            stop_event.set()

        stopper = asyncio.create_task(_stop_soon())
        await run_orphan_upload_cleaner(settings, stop_event)
        await stopper
