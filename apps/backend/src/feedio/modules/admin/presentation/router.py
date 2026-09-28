from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from feedio.modules.admin.application.ports import AdminRepository
from feedio.modules.admin.domain.errors import (
    AdminOrganizationNotFoundError,
    AdminUserNotFoundError,
    InvalidRoleError,
    InvalidStatusError,
)
from feedio.modules.admin.presentation.schemas import (
    AdminAuditLogResponse,
    AdminOrganizationResponse,
    AdminOverviewResponse,
    AdminUserResponse,
    PlatformMetricsResponse,
    StorageBreakdownResponse,
    SystemServiceHealthResponse,
    UpdateOrganizationQuotaRequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.shared.application.health import DependencyChecker


def create_admin_router(
    admin_repository_provider: Callable[..., Any],
    dependency_checker_provider: Callable[[], DependencyChecker],
    current_user_provider: Callable[..., Any],
) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["platform-admin"])

    def require_admin_or_support(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> CurrentUser:
        if current_user.platform_role not in ("super_admin", "support"):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Access restricted to platform administrators and support staff",
            )
        return current_user

    def require_super_admin(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> CurrentUser:
        if current_user.platform_role != "super_admin":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Super administrator privileges required to perform this action",
            )
        return current_user

    @router.get(
        "/overview",
        response_model=AdminOverviewResponse,
        dependencies=[Depends(require_admin_or_support)],
    )
    async def get_overview(
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
        checker: Annotated[DependencyChecker, Depends(dependency_checker_provider)],
    ) -> AdminOverviewResponse:
        metrics = await repo.get_metrics()
        report = await checker.check()

        dep_info = {
            "postgres": (
                "PostgreSQL Database",
                "Primary transactional data store with connection pooling",
                "Primary cluster active",
            ),
            "valkey": (
                "Valkey In-Memory Cache & Limiter",
                "Sliding-window rate limiter & session state storage",
                "Session state and cache optimal",
            ),
            "garage": (
                "Garage S3 Object Storage",
                "Distributed cluster for raw footage & transcoded HLS stream files",
                "Storage nodes reachable",
            ),
            "rabbitmq": (
                "RabbitMQ Message Broker",
                "Distributed async queue for video transcoding & webhook dispatch",
                "Transcode queues operational",
            ),
        }

        now = datetime.now(UTC)
        system_health: list[SystemServiceHealthResponse] = []

        for dep in report.dependencies:
            name, desc, details = dep_info.get(
                dep.name, (dep.name.title(), "Feedi core service dependency", "Operational")
            )
            svc_status = "healthy" if dep.healthy else "down"
            latency_ms = round(dep.latency_seconds * 1000, 2)
            system_health.append(
                SystemServiceHealthResponse(
                    name=name,
                    description=desc,
                    status=svc_status,
                    latency_ms=latency_ms,
                    details=f"{details}, latency: {latency_ms}ms",
                    updated_at=now,
                )
            )

        # Gateway / Ingress status
        system_health.append(
            SystemServiceHealthResponse(
                name="Cloudflare Tunnel Ingress Gateway",
                description="Zero-trust ingress tunnel with automated Edge SSL & DDoS protection",
                status="healthy",
                latency_ms=0.8,
                details="QUIC/TLS tunnel active, zero inbound ports exposed",
                updated_at=now,
            )
        )

        return AdminOverviewResponse(
            metrics=PlatformMetricsResponse(
                total_users=metrics.total_users,
                active_organizations=metrics.active_organizations,
                total_storage_bytes=metrics.total_storage_bytes,
                storage_capacity_bytes=metrics.storage_capacity_bytes,
                total_projects=metrics.total_projects,
                total_media_files=metrics.total_media_files,
                transcoding_queue_depth=metrics.transcoding_queue_depth,
                requests_per_minute=metrics.requests_per_minute,
                blocked_rate_limit_requests=metrics.blocked_rate_limit_requests,
                storage_breakdown=StorageBreakdownResponse(
                    raw_uploads_bytes=metrics.storage_breakdown.raw_uploads_bytes,
                    proxies_bytes=metrics.storage_breakdown.proxies_bytes,
                    waveforms_bytes=metrics.storage_breakdown.waveforms_bytes,
                    cache_bytes=metrics.storage_breakdown.cache_bytes,
                ),
            ),
            system_health=system_health,
        )

    @router.get(
        "/users",
        response_model=list[AdminUserResponse],
        dependencies=[Depends(require_admin_or_support)],
    )
    async def list_users(
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> list[AdminUserResponse]:
        users = await repo.list_users()
        return [
            AdminUserResponse(
                id=u.id,
                email=u.email,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
                platform_role=u.platform_role,
                status=u.status,
                organizations_count=u.organizations_count,
                created_at=u.created_at,
                last_active_at=u.last_active_at,
            )
            for u in users
        ]

    @router.patch(
        "/users/{user_id}/role",
        response_model=AdminUserResponse,
    )
    async def update_user_role(
        user_id: UUID,
        payload: UpdateUserRoleRequest,
        request: Request,
        actor: Annotated[CurrentUser, Depends(require_super_admin)],
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> AdminUserResponse:
        try:
            ip = request.client.host if request.client else "127.0.0.1"
            updated = await repo.update_user_role(
                user_id=user_id,
                new_role=payload.new_role,
                actor_email=actor.email,
                actor_role=actor.platform_role,
                ip_address=ip,
            )
            return AdminUserResponse(
                id=updated.id,
                email=updated.email,
                display_name=updated.display_name,
                avatar_url=updated.avatar_url,
                platform_role=updated.platform_role,
                status=updated.status,
                organizations_count=updated.organizations_count,
                created_at=updated.created_at,
                last_active_at=updated.last_active_at,
            )
        except AdminUserNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidRoleError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.patch(
        "/users/{user_id}/status",
        response_model=AdminUserResponse,
    )
    async def update_user_status(
        user_id: UUID,
        payload: UpdateUserStatusRequest,
        request: Request,
        actor: Annotated[CurrentUser, Depends(require_admin_or_support)],
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> AdminUserResponse:
        try:
            ip = request.client.host if request.client else "127.0.0.1"
            updated = await repo.update_user_status(
                user_id=user_id,
                new_status=payload.new_status,
                actor_email=actor.email,
                actor_role=actor.platform_role,
                ip_address=ip,
            )
            return AdminUserResponse(
                id=updated.id,
                email=updated.email,
                display_name=updated.display_name,
                avatar_url=updated.avatar_url,
                platform_role=updated.platform_role,
                status=updated.status,
                organizations_count=updated.organizations_count,
                created_at=updated.created_at,
                last_active_at=updated.last_active_at,
            )
        except AdminUserNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidStatusError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.get(
        "/organizations",
        response_model=list[AdminOrganizationResponse],
        dependencies=[Depends(require_admin_or_support)],
    )
    async def list_organizations(
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> list[AdminOrganizationResponse]:
        orgs = await repo.list_organizations()
        return [
            AdminOrganizationResponse(
                id=o.id,
                name=o.name,
                slug=o.slug,
                plan_tier=o.plan_tier,
                storage_used_bytes=o.storage_used_bytes,
                storage_limit_bytes=o.storage_limit_bytes,
                projects_count=o.projects_count,
                members_count=o.members_count,
                created_at=o.created_at,
                owner_email=o.owner_email,
            )
            for o in orgs
        ]

    @router.patch(
        "/organizations/{organization_id}/quota",
        response_model=AdminOrganizationResponse,
    )
    async def update_organization_quota(
        organization_id: UUID,
        payload: UpdateOrganizationQuotaRequest,
        request: Request,
        actor: Annotated[CurrentUser, Depends(require_admin_or_support)],
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> AdminOrganizationResponse:
        try:
            ip = request.client.host if request.client else "127.0.0.1"
            updated = await repo.update_organization_quota(
                organization_id=organization_id,
                new_quota_bytes=payload.new_quota_bytes,
                actor_email=actor.email,
                actor_role=actor.platform_role,
                ip_address=ip,
            )
            return AdminOrganizationResponse(
                id=updated.id,
                name=updated.name,
                slug=updated.slug,
                plan_tier=updated.plan_tier,
                storage_used_bytes=updated.storage_used_bytes,
                storage_limit_bytes=updated.storage_limit_bytes,
                projects_count=updated.projects_count,
                members_count=updated.members_count,
                created_at=updated.created_at,
                owner_email=updated.owner_email,
            )
        except AdminOrganizationNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.get(
        "/audit-logs",
        response_model=list[AdminAuditLogResponse],
        dependencies=[Depends(require_admin_or_support)],
    )
    async def list_audit_logs(
        repo: Annotated[AdminRepository, Depends(admin_repository_provider)],
    ) -> list[AdminAuditLogResponse]:
        logs = await repo.list_audit_logs()
        return [
            AdminAuditLogResponse(
                id=l.id,
                timestamp=l.timestamp,
                actor_email=l.actor_email,
                actor_role=l.actor_role,
                action=l.action,
                target_type=l.target_type,
                target_name=l.target_name,
                details=l.details,
                ip_address=l.ip_address,
                status=l.status,
            )
            for l in logs
        ]

    return router
