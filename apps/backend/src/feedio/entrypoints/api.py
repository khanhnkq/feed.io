from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import SessionDependency, engine
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository
from feedio.modules.projects.public import create_projects_router
from feedio.shared.presentation.health import router as health_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


async def provide_project_repository(session: SessionDependency) -> ProjectRepository:
    return SqlProjectRepository(session)


def create_app(
    project_repository_provider: Callable[..., ProjectRepository] | None = None,
) -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api/v1")
    provider: Any = project_repository_provider or provide_project_repository
    app.include_router(create_projects_router(provider), prefix="/api/v1")
    return app


app = create_app()
