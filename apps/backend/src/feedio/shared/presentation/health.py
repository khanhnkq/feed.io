from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from feedio.shared.application.health import DependencyChecker


def create_health_router(
    checker_provider: Callable[[], DependencyChecker],
) -> APIRouter:
    router = APIRouter(prefix="/health", tags=["health"])

    @router.get("/live", operation_id="health_live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @router.get("/ready", operation_id="health_ready", response_class=JSONResponse)
    async def ready(
        checker: Annotated[DependencyChecker, Depends(checker_provider)],
    ) -> JSONResponse:
        report = await checker.check()
        payload = {
            "status": "ready" if report.ready else "not_ready",
            "dependencies": {
                dependency.name: {
                    "status": "up" if dependency.healthy else "down",
                    "latency_ms": round(dependency.latency_seconds * 1000, 2),
                }
                for dependency in report.dependencies
            },
        }
        response_status = (
            status.HTTP_200_OK if report.ready else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return JSONResponse(payload, response_status)

    return router
