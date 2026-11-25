import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from feedio.bootstrap.config import Settings
from feedio.entrypoints.worker import run_valkey_consumer
from feedio.modules.media.infrastructure.rabbitmq_job_publisher import (
    RabbitMQMediaJobPublisher,
)
from feedio.modules.media.infrastructure.valkey_job_publisher import (
    VALKEY_TRANSCODE_QUEUE_KEY,
    ValkeyMediaJobPublisher,
    create_media_job_publisher,
)
from feedio.shared.infrastructure.dependency_checker import InfrastructureDependencyChecker


def _make_settings(**overrides: Any) -> Settings:
    defaults: dict[str, Any] = {
        "environment": "development",
        "valkey_url": "redis://localhost:6379/0",
        "queue_provider": "valkey",
        "queue_valkey_url": None,
        "rabbitmq_url": "amqps://user:pass@armadillo.rmq.cloudamqp.com/vhost",
        "storage_provider": "appwrite",
        "worker_queue_poll_timeout_seconds": 1,
    }
    defaults.update(overrides)
    return Settings(**defaults)


@pytest.mark.asyncio
async def test_valkey_job_publisher_pushes_fifo_payload() -> None:
    fake_redis = MagicMock()
    fake_redis.rpush = AsyncMock(return_value=1)
    fake_redis.aclose = AsyncMock()

    settings = _make_settings()
    publisher = ValkeyMediaJobPublisher(settings, redis_client=fake_redis)

    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()

    await publisher.publish_transcode_job(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        storage_key=f"orgs/{org_id}/{media_id}/clip.mp4",
        filename="clip.mp4",
        mime_type="video/mp4",
    )

    fake_redis.rpush.assert_awaited_once()
    queue_key, raw_body = fake_redis.rpush.call_args.args
    assert queue_key == VALKEY_TRANSCODE_QUEUE_KEY
    decoded = json.loads(raw_body.decode("utf-8"))
    assert decoded == {
        "organization_id": str(org_id),
        "project_id": str(proj_id),
        "media_id": str(media_id),
        "storage_key": f"orgs/{org_id}/{media_id}/clip.mp4",
        "filename": "clip.mp4",
        "mime_type": "video/mp4",
    }

    # Borrowed client must not be closed by publisher
    await publisher.aclose()
    fake_redis.aclose.assert_not_awaited()


@pytest.mark.asyncio
async def test_valkey_job_publisher_fails_open_when_unavailable() -> None:
    fake_redis = MagicMock()
    fake_redis.rpush = AsyncMock(side_effect=ConnectionError("Valkey unreachable"))

    publisher = ValkeyMediaJobPublisher(_make_settings(), redis_client=fake_redis)
    # Must not raise
    await publisher.publish_transcode_job(
        organization_id=uuid4(),
        project_id=uuid4(),
        media_id=uuid4(),
        storage_key="orgs/test.mp4",
        filename="test.mp4",
        mime_type="video/mp4",
    )


def test_create_media_job_publisher_selects_provider() -> None:
    valkey_pub = create_media_job_publisher(_make_settings(queue_provider="valkey"))
    assert isinstance(valkey_pub, ValkeyMediaJobPublisher)

    rmq_pub = create_media_job_publisher(_make_settings(queue_provider="rabbitmq"))
    assert isinstance(rmq_pub, RabbitMQMediaJobPublisher)


def test_valkey_job_publisher_prefers_dedicated_cloud_queue_url() -> None:
    upstash_url = "rediss://default:token@apn1-upstash.upstash.io:6379"
    settings = _make_settings(queue_valkey_url=upstash_url)
    publisher = ValkeyMediaJobPublisher(settings)
    assert publisher._valkey_url == upstash_url


@pytest.mark.asyncio
async def test_valkey_consumer_processes_message_and_stops_cleanly() -> None:
    stop_event = asyncio.Event()
    sample_payload = json.dumps(
        {
            "organization_id": str(uuid4()),
            "project_id": str(uuid4()),
            "media_id": str(uuid4()),
            "storage_key": "orgs/demo.mp4",
            "filename": "demo.mp4",
            "mime_type": "video/mp4",
        }
    ).encode("utf-8")

    fake_queue_client = MagicMock()
    fake_queue_client.ping = AsyncMock(return_value=True)
    fake_queue_client.aclose = AsyncMock()

    async def _blpop_side_effect(*_args: Any, **_kwargs: Any) -> tuple[bytes, bytes] | None:
        stop_event.set()
        return (VALKEY_TRANSCODE_QUEUE_KEY.encode("utf-8"), sample_payload)

    fake_queue_client.blpop = AsyncMock(side_effect=_blpop_side_effect)

    with (
        patch("feedio.entrypoints.worker.Redis.from_url", return_value=fake_queue_client),
        patch(
            "feedio.entrypoints.worker.process_job_payload", new_callable=AsyncMock
        ) as mock_process,
    ):
        await run_valkey_consumer(_make_settings(), stop_event)

    mock_process.assert_awaited_once()
    assert mock_process.call_args.args[0] == sample_payload
    fake_queue_client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_dependency_checker_switches_queue_check_by_provider() -> None:
    fake_engine = MagicMock()
    fake_conn = AsyncMock()
    fake_ctx = AsyncMock()
    fake_ctx.__aenter__.return_value = fake_conn
    fake_engine.connect.return_value = fake_ctx

    fake_redis = MagicMock()
    fake_redis.ping = AsyncMock(return_value=True)
    fake_redis.aclose = AsyncMock()

    fake_http_resp = MagicMock()
    fake_http_resp.raise_for_status = MagicMock()
    fake_http_client = AsyncMock()
    fake_http_client.get.return_value = fake_http_resp
    fake_http_ctx = AsyncMock()
    fake_http_ctx.__aenter__.return_value = fake_http_client

    with (
        patch(
            "feedio.shared.infrastructure.dependency_checker.Redis.from_url",
            return_value=fake_redis,
        ),
        patch(
            "feedio.shared.infrastructure.dependency_checker.httpx.AsyncClient",
            return_value=fake_http_ctx,
        ),
    ):
        checker_valkey = InfrastructureDependencyChecker(
            fake_engine, _make_settings(queue_provider="valkey")
        )
        report_valkey = await checker_valkey.check()
        names = {dep.name for dep in report_valkey.dependencies}
        assert names == {"postgres", "valkey", "valkey_queue", "appwrite"}
        assert report_valkey.ready is True
