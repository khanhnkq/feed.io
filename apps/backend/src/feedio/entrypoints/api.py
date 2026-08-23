from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import SessionDependency, engine
from feedio.bootstrap.identity import IdentityServices
from feedio.modules.identity.application.ports import AuthRepository
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.infrastructure.repository import SqlAuthRepository
from feedio.modules.identity.presentation.cookies import AuthCookieSettings
from feedio.modules.identity.presentation.dependencies import create_current_user_dependency
from feedio.modules.identity.presentation.router import create_auth_router
from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.application.get_by_slug import GetOrganizationBySlug
from feedio.modules.organizations.application.list_user_organizations import ListUserOrganizations
from feedio.modules.organizations.application.ports import OrganizationAccessRepository
from feedio.modules.organizations.domain.models import OrganizationContext
from feedio.modules.organizations.infrastructure.access_repository import (
    SqlOrganizationAccessRepository,
)
from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository
from feedio.modules.organizations.presentation.dependencies import (
    create_organization_context_dependency,
)
from feedio.modules.organizations.presentation.router import create_organizations_router
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository
from feedio.modules.projects.public import create_projects_router
from feedio.shared.application.health import DependencyChecker
from feedio.shared.infrastructure.dependency_checker import InfrastructureDependencyChecker
from feedio.shared.presentation.health import create_health_router
from feedio.shared.presentation.metrics import MetricsMiddleware


async def provide_auth_repository(session: SessionDependency) -> AuthRepository:
    return SqlAuthRepository(session)


async def provide_organization_access_repository(
    session: SessionDependency,
) -> OrganizationAccessRepository:
    return SqlOrganizationAccessRepository(session)


def provide_dependency_checker() -> DependencyChecker:
    return InfrastructureDependencyChecker(engine, get_settings())


def create_app(
    project_repository_provider: Callable[..., ProjectRepository] | None = None,
    dependency_checker_provider: Callable[[], DependencyChecker] | None = None,
    organization_context_provider: Callable[..., OrganizationContext] | None = None,
) -> FastAPI:
    settings = get_settings()
    identity_services = IdentityServices(settings)
    current_user_dependency = create_current_user_dependency(
        identity_services.provide_tokens,
        provide_auth_repository,
    )
    default_context_provider = create_organization_context_dependency(
        current_user_dependency,
        provide_organization_access_repository,
    )
    context_provider: Any = organization_context_provider or default_context_provider

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await engine.dispose()

    async def provide_auth_service(session: SessionDependency) -> AuthService:
        return AuthService(
            repository=SqlAuthRepository(session),
            passwords=identity_services.provide_passwords(),
            tokens=identity_services.provide_tokens(),
            mailer=identity_services.provide_mailer(),
            refresh_ttl_seconds=settings.auth_refresh_ttl_seconds,
        )

    async def provide_create_organization(session: SessionDependency) -> CreateOrganization:
        return CreateOrganization(SqlOrganizationRepository(session))

    async def provide_list_organizations(session: SessionDependency) -> ListUserOrganizations:
        return ListUserOrganizations(SqlOrganizationRepository(session))

    async def provide_get_organization_by_slug(session: SessionDependency) -> GetOrganizationBySlug:
        return GetOrganizationBySlug(SqlOrganizationRepository(session))

    async def provide_scoped_project_repository(
        session: SessionDependency,
        _: Annotated[OrganizationContext, Depends(context_provider)],
    ) -> ProjectRepository:
        return SqlProjectRepository(session)

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
    app.include_router(
        create_auth_router(
            auth_service_provider=provide_auth_service,
            current_user_provider=current_user_dependency,
            cookie_settings=AuthCookieSettings(secure=settings.auth_cookie_secure),
        ),
        prefix="/api/v1",
    )
    app.include_router(
        create_organizations_router(
            provide_create_organization,
            provide_list_organizations,
            current_user_dependency,
            provide_get_organization_by_slug,
        ),
        prefix="/api/v1",
    )
    provider: Any = project_repository_provider or provide_scoped_project_repository
    app.include_router(create_projects_router(provider, context_provider), prefix="/api/v1")
    app.mount("/metrics", make_asgi_app())
    return app


app = create_app()
