from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from feedio.bootstrap.config import get_settings
from feedio.bootstrap.database import SessionDependency, engine
from feedio.bootstrap.identity import IdentityServices
from feedio.modules.collaboration.public import (
    ValkeyConnectionManager,
    ValkeyEventPublisher,
    ValkeyPresenceService,
    create_collaboration_router,
)
from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.infrastructure.repository import SqlCommentRepository
from feedio.modules.comments.presentation.router import create_comments_router
from feedio.modules.identity.application.ports import AuthRepository
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.infrastructure.repository import SqlAuthRepository
from feedio.modules.identity.presentation.cookies import AuthCookieSettings
from feedio.modules.identity.presentation.dependencies import create_current_user_dependency
from feedio.modules.identity.presentation.router import create_auth_router
from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.infrastructure.rabbitmq_job_publisher import (
    RabbitMQMediaJobPublisher,
)
from feedio.modules.media.infrastructure.repository import SqlMediaRepository
from feedio.modules.media.infrastructure.storage import S3StorageService
from feedio.modules.media.public import create_media_router
from feedio.modules.organizations.application.accept_invitation import AcceptInvitation
from feedio.modules.organizations.application.accept_user_invitation_direct import (
    AcceptUserInvitationDirect,
)
from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.application.decline_user_invitation import (
    DeclineUserInvitation,
)
from feedio.modules.organizations.application.delete import DeleteOrganization
from feedio.modules.organizations.application.get_by_slug import GetOrganizationBySlug
from feedio.modules.organizations.application.get_invitation_details import GetInvitationDetails
from feedio.modules.organizations.application.invite_member import InviteMember
from feedio.modules.organizations.application.leave import LeaveOrganization
from feedio.modules.organizations.application.list_invitations import ListOrganizationInvitations
from feedio.modules.organizations.application.list_members import ListOrganizationMembers
from feedio.modules.organizations.application.list_user_organizations import ListUserOrganizations
from feedio.modules.organizations.application.list_user_received_invitations import (
    ListUserReceivedInvitations,
)
from feedio.modules.organizations.application.ports import (
    OrganizationAccessRepository,
    OrganizationMailer,
)
from feedio.modules.organizations.application.remove_member import RemoveMember
from feedio.modules.organizations.application.revoke_invitation import RevokeInvitation
from feedio.modules.organizations.application.update import UpdateOrganization
from feedio.modules.organizations.application.update_member_role import UpdateMemberRole
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.organizations.infrastructure.access_repository import (
    SqlOrganizationAccessRepository,
)
from feedio.modules.organizations.infrastructure.mailer import SmtpOrganizationMailer
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
    media_repository_provider: Callable[..., MediaRepository] | None = None,
    storage_service_provider: Callable[[], StorageService] | None = None,
    job_publisher_provider: Callable[[], MediaJobPublisher] | None = None,
    comment_repository_provider: Callable[..., CommentRepository] | None = None,
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

    connection_manager = ValkeyConnectionManager(settings.valkey_url)
    event_publisher = ValkeyEventPublisher(settings)
    presence_service = ValkeyPresenceService(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await connection_manager.start()
        yield
        await connection_manager.stop()
        await engine.dispose()

    async def provide_auth_service(session: SessionDependency) -> AuthService:
        return AuthService(
            repository=SqlAuthRepository(session),
            passwords=identity_services.provide_passwords(),
            tokens=identity_services.provide_tokens(),
            mailer=identity_services.provide_mailer(),
            refresh_ttl_seconds=settings.auth_refresh_ttl_seconds,
        )

    def provide_organization_mailer() -> OrganizationMailer:
        return SmtpOrganizationMailer(
            host=settings.smtp_host,
            port=settings.smtp_port,
            sender=settings.smtp_sender,
            web_base_url=settings.web_base_url,
            start_tls=settings.smtp_start_tls,
        )

    async def provide_create_organization(session: SessionDependency) -> CreateOrganization:
        return CreateOrganization(SqlOrganizationRepository(session))

    async def provide_list_organizations(session: SessionDependency) -> ListUserOrganizations:
        return ListUserOrganizations(SqlOrganizationRepository(session))

    async def provide_get_organization_by_slug(session: SessionDependency) -> GetOrganizationBySlug:
        return GetOrganizationBySlug(SqlOrganizationRepository(session))

    async def provide_list_members(session: SessionDependency) -> ListOrganizationMembers:
        return ListOrganizationMembers(SqlOrganizationRepository(session))

    async def provide_invite_member(session: SessionDependency) -> InviteMember:
        return InviteMember(
            SqlOrganizationRepository(session),
            provide_organization_mailer(),
        )

    async def provide_list_invitations(session: SessionDependency) -> ListOrganizationInvitations:
        return ListOrganizationInvitations(SqlOrganizationRepository(session))

    async def provide_revoke_invitation(session: SessionDependency) -> RevokeInvitation:
        return RevokeInvitation(SqlOrganizationRepository(session))

    async def provide_update_member_role(session: SessionDependency) -> UpdateMemberRole:
        return UpdateMemberRole(SqlOrganizationRepository(session))

    async def provide_remove_member(session: SessionDependency) -> RemoveMember:
        return RemoveMember(SqlOrganizationRepository(session))

    async def provide_get_invitation_details(session: SessionDependency) -> GetInvitationDetails:
        return GetInvitationDetails(SqlOrganizationRepository(session))

    async def provide_accept_invitation(session: SessionDependency) -> AcceptInvitation:
        return AcceptInvitation(SqlOrganizationRepository(session))

    async def provide_list_user_received_invitations(
        session: SessionDependency,
    ) -> ListUserReceivedInvitations:
        return ListUserReceivedInvitations(SqlOrganizationRepository(session))

    async def provide_accept_user_invitation_direct(
        session: SessionDependency,
    ) -> AcceptUserInvitationDirect:
        return AcceptUserInvitationDirect(SqlOrganizationRepository(session))

    async def provide_decline_user_invitation(
        session: SessionDependency,
    ) -> DeclineUserInvitation:
        return DeclineUserInvitation(SqlOrganizationRepository(session))

    async def provide_update_organization(
        session: SessionDependency,
    ) -> UpdateOrganization:
        return UpdateOrganization(SqlOrganizationRepository(session))

    async def provide_delete_organization(
        session: SessionDependency,
    ) -> DeleteOrganization:
        return DeleteOrganization(SqlOrganizationRepository(session))

    async def provide_leave_organization(
        session: SessionDependency,
    ) -> LeaveOrganization:
        return LeaveOrganization(SqlOrganizationRepository(session))

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
            create_organization_provider=provide_create_organization,
            list_organizations_provider=provide_list_organizations,
            current_user_provider=current_user_dependency,
            get_by_slug_provider=provide_get_organization_by_slug,
            context_provider=context_provider,
            list_members_provider=provide_list_members,
            invite_member_provider=provide_invite_member,
            list_invitations_provider=provide_list_invitations,
            revoke_invitation_provider=provide_revoke_invitation,
            update_member_role_provider=provide_update_member_role,
            remove_member_provider=provide_remove_member,
            get_invitation_details_provider=provide_get_invitation_details,
            accept_invitation_provider=provide_accept_invitation,
            list_user_received_invitations_provider=provide_list_user_received_invitations,
            accept_user_invitation_direct_provider=provide_accept_user_invitation_direct,
            decline_user_invitation_provider=provide_decline_user_invitation,
            update_organization_provider=provide_update_organization,
            delete_organization_provider=provide_delete_organization,
            leave_organization_provider=provide_leave_organization,
        ),
        prefix="/api/v1",
    )
    async def provide_scoped_media_repository(
        session: SessionDependency,
        _: Annotated[OrganizationContext, Depends(context_provider)],
    ) -> MediaRepository:
        return SqlMediaRepository(session)

    def provide_default_storage_service() -> StorageService:
        return S3StorageService(settings)

    def provide_default_job_publisher() -> MediaJobPublisher:
        return RabbitMQMediaJobPublisher(settings)

    provider: Any = project_repository_provider or provide_scoped_project_repository
    app.include_router(create_projects_router(provider, context_provider), prefix="/api/v1")

    media_repo_provider: Any = media_repository_provider or provide_scoped_media_repository
    storage_provider: Any = storage_service_provider or provide_default_storage_service
    publisher_provider: Any = job_publisher_provider or provide_default_job_publisher
    app.include_router(
        create_media_router(
            media_repository_provider=media_repo_provider,
            project_repository_provider=provider,
            storage_service_provider=storage_provider,
            organization_context_provider=context_provider,
            job_publisher_provider=publisher_provider,
        ),
        prefix="/api/v1",
    )

    async def provide_scoped_comment_repository(
        session: SessionDependency,
        _: Annotated[OrganizationContext, Depends(context_provider)],
    ) -> CommentRepository:
        return SqlCommentRepository(session)

    comment_repo_provider: Any = comment_repository_provider or provide_scoped_comment_repository
    app.include_router(
        create_comments_router(
            comment_repository_provider=comment_repo_provider,
            media_repository_provider=media_repo_provider,
            project_repository_provider=provider,
            organization_context_provider=context_provider,
            event_publisher_provider=lambda: event_publisher,
        ),
        prefix="/api/v1",
    )
    app.include_router(
        create_collaboration_router(
            connection_manager=connection_manager,
            event_publisher=event_publisher,
            presence_service=presence_service,
            token_manager=identity_services.provide_tokens(),
            auth_repo_provider=provide_auth_repository,
        ),
        prefix="/api/v1",
    )

    app.mount("/metrics", make_asgi_app())
    return app


app = create_app()
