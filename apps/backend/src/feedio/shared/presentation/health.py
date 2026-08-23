from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from feedio.bootstrap.database import SessionDependency

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", operation_id="health_live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", operation_id="health_ready", response_class=JSONResponse)
async def ready(session: SessionDependency) -> JSONResponse:
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "not_ready"}, status.HTTP_503_SERVICE_UNAVAILABLE)
    return JSONResponse({"status": "ready"})
