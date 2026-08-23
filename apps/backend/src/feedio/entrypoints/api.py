from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import SessionDependency, engine
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository
from feedio.modules.projects.public import create_projects_router
from feedio.shared.application.health import DependencyChecker
from feedio.shared.infrastructure.dependency_checker import InfrastructureDependencyChecker
from feedio.shared.presentation.health import create_health_router
from feedio.shared.presentation.metrics import MetricsMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


async def provide_project_repository(session: SessionDependency) -> ProjectRepository:
    return SqlProjectRepository(session)


def provide_dependency_checker() -> DependencyChecker:
    return InfrastructureDependencyChecker(engine, get_settings())


def create_app(
    project_repository_provider: Callable[..., ProjectRepository] | None = None,
    dependency_checker_provider: Callable[[], DependencyChecker] | None = None,
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
    app.add_middleware(MetricsMiddleware)
    checker_provider = dependency_checker_provider or provide_dependency_checker
    app.include_router(create_health_router(checker_provider), prefix="/api/v1")
    provider: Any = project_repository_provider or provide_project_repository
    app.include_router(create_projects_router(provider), prefix="/api/v1")
    app.mount("/metrics", make_asgi_app())
    return app


app = create_app()
