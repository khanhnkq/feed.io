import asyncio
from collections.abc import Awaitable, Callable
from time import monotonic

import aio_pika
import httpx
from prometheus_client import Gauge, Histogram
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from feedio.bootstrap.config import Settings
from feedio.shared.application.health import DependencyStatus, HealthReport

DEPENDENCY_UP = Gauge(
    "feedio_dependency_up",
    "Whether a Feed.io runtime dependency is reachable.",
    labelnames=("dependency",),
)
DEPENDENCY_LATENCY = Histogram(
    "feedio_dependency_check_seconds",
    "Latency of Feed.io dependency checks.",
    labelnames=("dependency",),
)


class InfrastructureDependencyChecker:
    def __init__(self, engine: AsyncEngine, settings: Settings) -> None:
        self._engine = engine
        self._settings = settings

    async def check(self) -> HealthReport:
        checks = (
            self._timed_check("postgres", self._check_postgres),
            self._timed_check("valkey", self._check_valkey),
            self._timed_check("rabbitmq", self._check_rabbitmq),
            self._timed_check("garage", self._check_garage),
        )
        return HealthReport(tuple(await asyncio.gather(*checks)))

    async def _timed_check(
        self,
        name: str,
        operation: Callable[[], Awaitable[None]],
    ) -> DependencyStatus:
        started_at = monotonic()
        healthy = True
        try:
            await asyncio.wait_for(operation(), timeout=self._settings.dependency_timeout_seconds)
        except Exception:
            healthy = False
        latency = monotonic() - started_at
        DEPENDENCY_UP.labels(dependency=name).set(1 if healthy else 0)
        DEPENDENCY_LATENCY.labels(dependency=name).observe(latency)
        return DependencyStatus(name=name, healthy=healthy, latency_seconds=latency)

    async def _check_postgres(self) -> None:
        async with self._engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

    async def _check_valkey(self) -> None:
        client = Redis.from_url(self._settings.valkey_url, decode_responses=True)
        try:
            if not await client.ping():
                raise RuntimeError("Valkey ping failed")
        finally:
            await client.aclose()

    async def _check_rabbitmq(self) -> None:
        connection = await aio_pika.connect(self._settings.rabbitmq_url)
        await connection.close()

    async def _check_garage(self) -> None:
        headers = {"Authorization": f"Bearer {self._settings.garage_admin_token}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._settings.garage_admin_url}/health",
                headers=headers,
            )
            response.raise_for_status()
