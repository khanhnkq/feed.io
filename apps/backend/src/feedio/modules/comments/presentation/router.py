import logging
from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.modules.comments.application.commands.create_comment import CreateComment
from feedio.modules.comments.application.commands.delete_comment import DeleteComment
from feedio.modules.comments.application.commands.update_comment import UpdateComment
from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.application.queries.list_media_comments import ListMediaComments
from feedio.modules.comments.domain.errors import (
    CommentAccessDeniedError,
    CommentNotFoundError,
    InvalidCommentContentError,
)
from feedio.modules.comments.presentation.schemas import (
    CommentAuthorResponse,
    CommentResponse,
    CreateCommentRequest,
    UpdateCommentRequest,
)
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.organizations.application.ports import OrganizationRepository
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


def create_comments_router(
    comment_repository_provider: Callable[..., CommentRepository],
    media_repository_provider: Callable[..., MediaRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    organization_context_provider: Callable[..., OrganizationContext],
    event_publisher_provider: Callable[[], RealtimeEventPublisher] | None = None,
    notification_service_provider: Callable[..., NotificationService] | None = None,
    organization_repository_provider: Callable[..., OrganizationRepository] | None = None,
) -> APIRouter:
    router = APIRouter(
        prefix="/organizations/{organization_id}/projects/{project_id}/media/{media_id}/comments",
        tags=["media_comments"],
    )

    async def _verify_access(
        context: OrganizationContext,
        project_repository: ProjectRepository,
        media_repository: MediaRepository,
        project_id: UUID,
        media_id: UUID,
    ) -> None:
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await GetProject(project_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to project") from e

        media = await media_repository.get_by_id(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Media asset not found")

    @router.get(
        "",
        response_model=list[CommentResponse],
        operation_id="list_media_comments",
    )
    async def list_comments(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        comment_repository: Annotated[CommentRepository, Depends(comment_repository_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> list[CommentResponse]:
        await _verify_access(context, project_repository, media_repository, project_id, media_id)
        comments = await ListMediaComments(comment_repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )

        # Build nested tree: top-level comments with child replies
        comment_map: dict[UUID, CommentResponse] = {}
        top_level: list[CommentResponse] = []

        for c in comments:
            resp = CommentResponse(
                id=c.id,
                organization_id=c.organization_id,
                project_id=c.project_id,
                media_id=c.media_id,
                user_id=c.user_id,
                parent_comment_id=c.parent_comment_id,
                timestamp_seconds=c.timestamp_seconds,
                frame_number=c.frame_number,
                content=c.content,
                annotation_data=c.annotation_data,
                status=c.status,
                created_at=c.created_at,
                updated_at=c.updated_at,
                author=CommentAuthorResponse(
                    id=c.user_id,
                    name=c.author_name,
                    email=c.author_email,
                    avatar_url=c.author_avatar_url,
                ),
                replies=[],
            )
            comment_map[c.id] = resp

        for c in comments:
            resp = comment_map[c.id]
            if c.parent_comment_id and c.parent_comment_id in comment_map:
                comment_map[c.parent_comment_id].replies.append(resp)
            elif not c.parent_comment_id:
                top_level.append(resp)

        return top_level

    notification_service_dep = (
        Depends(notification_service_provider)
        if notification_service_provider is not None
        else Depends(lambda: None)
    )
    org_repo_dep = (
        Depends(organization_repository_provider)
        if organization_repository_provider is not None
        else Depends(lambda: None)
    )

    @router.post(
        "",
        response_model=CommentResponse,
        operation_id="create_comment",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def create_comment_endpoint(
        project_id: UUID,
        media_id: UUID,
        payload: CreateCommentRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        comment_repository: Annotated[CommentRepository, Depends(comment_repository_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        notification_service: Annotated[NotificationService | None, notification_service_dep] = None,
        organization_repository: Annotated[OrganizationRepository | None, org_repo_dep] = None,
    ) -> CommentResponse:
        await _verify_access(context, project_repository, media_repository, project_id, media_id)
        try:
            comment = await CreateComment(comment_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                user_id=context.user_id,
                content=payload.content,
                parent_comment_id=payload.parent_comment_id,
                timestamp_seconds=payload.timestamp_seconds,
                frame_number=payload.frame_number,
                annotation_data=payload.annotation_data,
            )
            result = CommentResponse(
                id=comment.id,
                organization_id=comment.organization_id,
                project_id=comment.project_id,
                media_id=comment.media_id,
                user_id=comment.user_id,
                parent_comment_id=comment.parent_comment_id,
                timestamp_seconds=comment.timestamp_seconds,
                frame_number=comment.frame_number,
                content=comment.content,
                annotation_data=comment.annotation_data,
                status=comment.status,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                author=CommentAuthorResponse(
                    id=comment.user_id,
                    name=comment.author_name,
                    email=comment.author_email,
                    avatar_url=comment.author_avatar_url,
                ),
                replies=[],
            )

            # Broadcast to media review room
            if event_publisher_provider:
                publisher = event_publisher_provider()
                await publisher.publish(
                    RealtimeEvent(
                        event_type="comment.created",
                        room=f"media:{media_id}",
                        payload={"comment": result.model_dump(mode="json")},
                    )
                )

            # Dispatch in-app notifications
            if notification_service:
                deep_link = (
                    f"/app/organizations/{getattr(context, 'organization_slug', None) or context.organization_id}"
                    f"/projects/{project_id}/media/{media_id}?commentId={comment.id}"
                )
                actor_name = comment.author_name or "A team member"

                # 1. Thread reply notification
                if payload.parent_comment_id:
                    parent = await comment_repository.get_by_id(
                        organization_id=context.organization_id,
                        project_id=project_id,
                        media_id=media_id,
                        comment_id=payload.parent_comment_id,
                    )
                    if parent and parent.user_id != context.user_id:
                        await notification_service.create_notification(
                            user_id=parent.user_id,
                            organization_id=context.organization_id,
                            actor_id=context.user_id,
                            type=NotificationType.COMMENT_REPLY,
                            title=f"{actor_name} replied to your comment",
                            message=f'"{payload.content[:140]}"',
                            link_url=deep_link,
                            metadata_json={
                                "project_id": str(project_id),
                                "media_id": str(media_id),
                                "comment_id": str(comment.id),
                                "parent_comment_id": str(payload.parent_comment_id),
                            },
                        )

                # 2. Mention notifications (@username or @name in payload.content)
                if "@" in payload.content and notification_service and organization_repository:
                    try:
                        members_page = await organization_repository.list_members(
                            context.organization_id, limit=200
                        )
                        content_lower = payload.content.lower()
                        for m in members_page.items:
                            if m.user_id == context.user_id:
                                continue
                            name_clean = (m.display_name or "").strip().lower()
                            name_no_space = name_clean.replace(" ", "")
                            email_prefix = (m.email or "").split("@")[0].strip().lower()
                            user_id_str = str(m.user_id)

                            is_mentioned = False
                            if name_clean and f"@{name_clean}" in content_lower:
                                is_mentioned = True
                            elif name_no_space and f"@{name_no_space}" in content_lower:
                                is_mentioned = True
                            elif email_prefix and f"@{email_prefix}" in content_lower:
                                is_mentioned = True
                            elif f"@{user_id_str}" in content_lower:
                                is_mentioned = True

                            if is_mentioned:
                                await notification_service.create_notification(
                                    user_id=m.user_id,
                                    organization_id=context.organization_id,
                                    actor_id=context.user_id,
                                    type=NotificationType.MENTION,
                                    title=f"{actor_name} mentioned you",
                                    message=f'"{payload.content[:140]}"',
                                    link_url=deep_link,
                                    metadata_json={
                                        "project_id": str(project_id),
                                        "media_id": str(media_id),
                                        "comment_id": str(comment.id),
                                    },
                                )
                    except Exception:
                        logger.exception("Failed to dispatch in-app mention notification")

            return result
        except InvalidCommentContentError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
        except CommentNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.patch(
        "/{comment_id}",
        response_model=CommentResponse,
        operation_id="update_comment",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def update_comment_endpoint(
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
        payload: UpdateCommentRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        comment_repository: Annotated[CommentRepository, Depends(comment_repository_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> CommentResponse:
        await _verify_access(context, project_repository, media_repository, project_id, media_id)
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            updated = await UpdateComment(comment_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                comment_id=comment_id,
                user_id=context.user_id,
                is_admin=is_admin,
                content=payload.content,
                status=payload.status,
            )
            result = CommentResponse(
                id=updated.id,
                organization_id=updated.organization_id,
                project_id=updated.project_id,
                media_id=updated.media_id,
                user_id=updated.user_id,
                parent_comment_id=updated.parent_comment_id,
                timestamp_seconds=updated.timestamp_seconds,
                frame_number=updated.frame_number,
                content=updated.content,
                annotation_data=updated.annotation_data,
                status=updated.status,
                created_at=updated.created_at,
                updated_at=updated.updated_at,
                author=CommentAuthorResponse(
                    id=updated.user_id,
                    name=updated.author_name,
                    email=updated.author_email,
                    avatar_url=updated.author_avatar_url,
                ),
                replies=[],
            )
            if event_publisher_provider:
                publisher = event_publisher_provider()
                await publisher.publish(
                    RealtimeEvent(
                        event_type="comment.updated",
                        room=f"media:{media_id}",
                        payload={"comment": result.model_dump(mode="json")},
                    )
                )
            return result
        except CommentNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except CommentAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(e)) from e
        except InvalidCommentContentError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.delete(
        "/{comment_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_comment",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def delete_comment_endpoint(
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        comment_repository: Annotated[CommentRepository, Depends(comment_repository_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> None:
        await _verify_access(context, project_repository, media_repository, project_id, media_id)
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await DeleteComment(comment_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                comment_id=comment_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
            if event_publisher_provider:
                publisher = event_publisher_provider()
                await publisher.publish(
                    RealtimeEvent(
                        event_type="comment.deleted",
                        room=f"media:{media_id}",
                        payload={"comment_id": str(comment_id), "media_id": str(media_id)},
                    )
                )
        except CommentNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except CommentAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(e)) from e

    return router
