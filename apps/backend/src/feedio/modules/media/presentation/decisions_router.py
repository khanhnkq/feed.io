from collections.abc import Callable
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaReviewDecision
from feedio.modules.media.presentation.schemas import (
    CreateMediaDecisionRequest,
    MediaDecisionListResponse,
    MediaDecisionResponse,
)
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import (
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)
from feedio.shared.infrastructure.persistence import utc_now


def create_media_decisions_router(
    media_repository_provider: Callable[..., MediaRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    organization_context_provider: Callable[..., OrganizationContext],
    event_publisher_provider: Callable[[], RealtimeEventPublisher | None] | None = None,
    notification_service_provider: Callable[..., NotificationService | None] | None = None,
) -> APIRouter:
    router = APIRouter(tags=["media-decisions"])

    async def _verify_project_access(
        context: OrganizationContext,
        project_repo: ProjectRepository,
        project_id: UUID,
    ) -> None:
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await GetProject(project_repo).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to project") from e

    @router.post(
        "/{media_id}/decisions",
        response_model=MediaDecisionResponse,
        status_code=status.HTTP_201_CREATED,
        operation_id="create_media_decision",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def create_media_decision(
        project_id: UUID,
        media_id: UUID,
        payload: CreateMediaDecisionRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        event_publisher: Annotated[
            RealtimeEventPublisher | None,
            Depends(event_publisher_provider or (lambda: None)),
        ] = None,
        notification_service: Annotated[
            NotificationService | None,
            Depends(notification_service_provider or (lambda: None)),
        ] = None,
    ) -> MediaDecisionResponse:
        await _verify_project_access(context, project_repository, project_id)

        media = await media_repository.get_by_id(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found")

        decision = MediaReviewDecision(
            id=uuid4(),
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
            user_id=context.user_id,
            status=payload.status,
            notes=payload.notes,
            created_at=utc_now(),
        )

        saved = await media_repository.record_decision(decision)
        await media_repository.update_review_status(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
            status=payload.status,
            reviewed_by_user_id=context.user_id,
        )

        # 1. Broadcast decision.updated event to media room
        if event_publisher:
            await event_publisher.publish(
                RealtimeEvent(
                    event_type="decision.updated",
                    room=f"media:{media_id}",
                    payload={
                        "media_id": str(media_id),
                        "status": payload.status,
                        "notes": payload.notes,
                        "user_id": str(context.user_id),
                        "user_name": saved.user_name,
                        "created_at": saved.created_at.isoformat(),
                    },
                )
            )

        # 2. In-app notification to media creator if different user
        if (
            notification_service
            and media.created_by_user_id
            and media.created_by_user_id != context.user_id
        ):
            status_labels = {
                "approved": "Approved",
                "needs_changes": "Needs Changes",
                "in_progress": "In Progress",
                "pending": "Pending",
            }
            label = status_labels.get(payload.status, payload.status)
            notes_suffix = f': "{payload.notes}"' if payload.notes else ""
            await notification_service.create_notification(
                user_id=media.created_by_user_id,
                organization_id=context.organization_id,
                actor_id=context.user_id,
                type=NotificationType.REVIEW_DECISION,
                title=f"Review status updated to {label}",
                message=f'Review decision for "{media.title}" was updated to {label}{notes_suffix}',
                link_url=f"/app/organizations/{context.organization_id}/projects/{project_id}/media/{media_id}",
                metadata_json={"media_id": str(media_id), "status": payload.status},
            )

        return MediaDecisionResponse(
            id=saved.id,
            organization_id=saved.organization_id,
            project_id=saved.project_id,
            media_id=saved.media_id,
            user_id=saved.user_id,
            user_name=saved.user_name,
            status=saved.status,
            notes=saved.notes,
            created_at=saved.created_at,
        )

    @router.get(
        "/{media_id}/decisions",
        response_model=MediaDecisionListResponse,
        operation_id="list_media_decisions",
    )
    async def list_media_decisions(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> MediaDecisionListResponse:
        await _verify_project_access(context, project_repository, project_id)

        items = await media_repository.list_decisions(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        return MediaDecisionListResponse(
            items=[
                MediaDecisionResponse(
                    id=item.id,
                    organization_id=item.organization_id,
                    project_id=item.project_id,
                    media_id=item.media_id,
                    user_id=item.user_id,
                    user_name=item.user_name,
                    status=item.status,
                    notes=item.notes,
                    created_at=item.created_at,
                )
                for item in items
            ]
        )

    return router
