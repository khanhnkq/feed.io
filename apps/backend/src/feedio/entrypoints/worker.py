import asyncio
import signal

import structlog
from prometheus_client import Gauge, start_http_server

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import engine
from feedio.shared.infrastructure.dependency_checker import InfrastructureDependencyChecker

WORKER_READY = Gauge("feedio_worker_ready", "Whether the infrastructure worker is ready.")
logger = structlog.get_logger()


async def run() -> None:
    settings = get_settings()
    checker = InfrastructureDependencyChecker(engine, settings)
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signal_name, stop_event.set)

    start_http_server(settings.worker_metrics_port)
    logger.info("worker_started", metrics_port=settings.worker_metrics_port)

    try:
        while not stop_event.is_set():
            report = await checker.check()
            WORKER_READY.set(1 if report.ready else 0)
            logger.info(
                "worker_probe_completed",
                ready=report.ready,
                dependencies={item.name: item.healthy for item in report.dependencies},
            )
            try:
                await asyncio.wait_for(
                    stop_event.wait(),
                    timeout=settings.worker_probe_interval_seconds,
                )
            except TimeoutError:
                continue
    finally:
        WORKER_READY.set(0)
        await engine.dispose()
        logger.info("worker_stopped")


if __name__ == "__main__":
    asyncio.run(run())
