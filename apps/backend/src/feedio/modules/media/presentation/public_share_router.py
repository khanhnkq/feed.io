import hashlib
import logging
from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.comments.application.commands.create_comment import CreateComment
from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.application.queries.list_media_comments import (
    ListMediaComments,
)
from feedio.modules.comments.presentation.schemas import (
    CommentAuthorResponse,
    CommentResponse,
)
from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.application.queries.get_public_share import GetPublicShare
from feedio.modules.media.domain.entities import MediaAsset, MediaReviewDecision, ShareLink
from feedio.modules.media.domain.errors import (
    MediaNotFoundError,
    ShareLinkExpiredError,
    ShareLinkNotFoundError,
    ShareLinkRevokedError,
)
from feedio.modules.media.presentation.schemas import (
    GuestCommentRequest,
    GuestDecisionRequest,
    MediaDecisionResponse,
    PublicShareDetailsResponse,
    VerifySharePassphraseRequest,
    VerifySharePassphraseResponse,
)
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.enums import NotificationType
from feedio.shared.infrastructure.persistence import utc_now

logger = logging.getLogger(__name__)


def _verify_passphrase(share_link: ShareLink, provided: str | None) -> bool:
    if not share_link.passphrase_hash:
        return True
    if not provided:
        return False
    pass_hash = hashlib.sha256(provided.strip().encode()).hexdigest()
    guest_token = hashlib.sha256((provided.strip() + share_link.token_hash).encode()).hexdigest()
    return pass_hash == share_link.passphrase_hash or provided == guest_token


async def _resolve_share(token: str, repo: MediaRepository) -> tuple[ShareLink, MediaAsset]:
    try:
        return await GetPublicShare(repo).execute(token)
    except (ShareLinkNotFoundError, MediaNotFoundError) as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
    except (ShareLinkRevokedError, ShareLinkExpiredError) as e:
        raise HTTPException(status.HTTP_410_GONE, str(e)) from e


def _build_comment_response(
    c: Any,
    author_name: str,
    author_email: str | None = None,
    avatar_url: str | None = None,
) -> CommentResponse:
    return CommentResponse(
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
            name=author_name,
            email=author_email,
            avatar_url=avatar_url,
        ),
        replies=[],
    )


def create_public_share_router(
    media_repository_provider: Callable[..., MediaRepository],
    storage_service_provider: Callable[..., StorageService],
    comment_repository_provider: Callable[..., CommentRepository] | None = None,
    event_publisher_provider: Callable[[], RealtimeEventPublisher | None] | None = None,
    notification_service_provider: Callable[..., NotificationService | None] | None = None,
) -> APIRouter:
    router = APIRouter(tags=["public-shares"])

    @router.get(
        "/{token}",
        response_model=PublicShareDetailsResponse,
        operation_id="get_public_share_details",
    )
    async def get_public_share_details(
        token: str,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> PublicShareDetailsResponse:
        share_link, media = await _resolve_share(token, media_repository)
        has_passphrase = share_link.passphrase_hash is not None
        is_authenticated = _verify_passphrase(share_link, x_share_passphrase)

        thumbnail_url = None
        if (not has_passphrase or is_authenticated) and media.thumbnail_storage_key:
            try:
                thumbnail_url = await storage.generate_presigned_view_url(
                    media.thumbnail_storage_key, expires_in=7200
                )
            except Exception:
                logger.warning("Failed to generate presigned thumbnail URL")

        return PublicShareDetailsResponse(
            media_id=media.id,
            title=media.title,
            filename=media.filename,
            duration_seconds=media.duration_seconds,
            fps=media.fps,
            width=media.width,
            height=media.height,
            mime_type=media.mime_type,
            review_status=media.review_status,
            has_passphrase=has_passphrase,
            is_authenticated=is_authenticated,
            allow_comments=share_link.allow_comments,
            allow_approval=share_link.allow_approval,
            allow_download=share_link.allow_download,
            thumbnail_url=thumbnail_url if is_authenticated else None,
            waveform_data=media.waveform_data if is_authenticated else None,
        )

    @router.post(
        "/{token}/verify",
        response_model=VerifySharePassphraseResponse,
        operation_id="verify_public_share_passphrase",
    )
    async def verify_passphrase_endpoint(
        token: str,
        payload: VerifySharePassphraseRequest,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
    ) -> VerifySharePassphraseResponse:
        share_link, _ = await _resolve_share(token, media_repository)
        if not share_link.passphrase_hash:
            return VerifySharePassphraseResponse(success=True)

        provided_hash = hashlib.sha256(payload.passphrase.strip().encode()).hexdigest()
        if provided_hash != share_link.passphrase_hash:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid passphrase")

        guest_token = hashlib.sha256(
            (payload.passphrase.strip() + share_link.token_hash).encode()
        ).hexdigest()
        return VerifySharePassphraseResponse(success=True, guest_token=guest_token)

    @router.get("/{token}/stream", operation_id="get_public_share_stream")
    async def get_public_share_stream(
        token: str,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> dict[str, Any]:
        share_link, media = await _resolve_share(token, media_repository)
        if not _verify_passphrase(share_link, x_share_passphrase):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Passphrase required")

        hls_url = None
        if media.hls_storage_key:
            hls_url = await storage.generate_presigned_view_url(
                media.hls_storage_key, expires_in=7200
            )

        stream_url = hls_url or await storage.generate_presigned_view_url(
            media.storage_key, expires_in=7200
        )

        return {
            "stream_url": stream_url,
            "hls_url": hls_url,
            "duration_seconds": media.duration_seconds,
            "fps": media.fps,
            "width": media.width,
            "height": media.height,
        }

    @router.get(
        "/{token}/comments",
        response_model=list[CommentResponse],
        operation_id="list_public_share_comments",
    )
    async def list_public_comments(
        token: str,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        comment_repository: Annotated[
            CommentRepository | None,
            Depends(comment_repository_provider or (lambda: None)),
        ] = None,
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> list[CommentResponse]:
        share_link, media = await _resolve_share(token, media_repository)
        if not _verify_passphrase(share_link, x_share_passphrase):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Passphrase required")
        if not share_link.allow_comments:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Comments disabled for link")
        if not comment_repository:
            return []

        raw_comments = await ListMediaComments(comment_repository).execute(
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=media.id,
        )

        comment_map: dict[UUID, CommentResponse] = {}
        top_level: list[CommentResponse] = []
        for c in raw_comments:
            resp = _build_comment_response(
                c, c.author_name or "Team Member", c.author_email, c.author_avatar_url
            )
            comment_map[c.id] = resp

        for c in raw_comments:
            resp = comment_map[c.id]
            if c.parent_comment_id and c.parent_comment_id in comment_map:
                comment_map[c.parent_comment_id].replies.append(resp)
            elif not c.parent_comment_id:
                top_level.append(resp)

        return top_level

    @router.post(
        "/{token}/comments",
        response_model=CommentResponse,
        status_code=status.HTTP_201_CREATED,
        operation_id="create_public_guest_comment",
    )
    async def create_public_guest_comment(
        token: str,
        payload: GuestCommentRequest,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        comment_repository: Annotated[
            CommentRepository,
            Depends(comment_repository_provider or (lambda: None)),
        ],
        event_publisher: Annotated[
            RealtimeEventPublisher | None,
            Depends(event_publisher_provider or (lambda: None)),
        ] = None,
        notification_service: Annotated[
            NotificationService | None,
            Depends(notification_service_provider or (lambda: None)),
        ] = None,
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> CommentResponse:
        share_link, media = await _resolve_share(token, media_repository)
        if not _verify_passphrase(share_link, x_share_passphrase):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Passphrase required")
        if not share_link.allow_comments:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Comments disabled for link")

        guest_author = f"{payload.guest_name.strip()} (Guest)"
        comment = await CreateComment(comment_repository).execute(
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=media.id,
            user_id=share_link.created_by_user_id,
            content=payload.content,
            parent_comment_id=payload.parent_comment_id,
            timestamp_seconds=payload.timestamp_seconds,
            frame_number=payload.frame_number,
            annotation_data=payload.annotation_data,
        )

        resp = _build_comment_response(comment, guest_author, payload.guest_email)
        if event_publisher:
            await event_publisher.publish(
                RealtimeEvent(
                    event_type="comment.created",
                    room=f"media:{media.id}",
                    payload={"comment": resp.model_dump(mode="json")},
                )
            )

        if notification_service and media.created_by_user_id:
            link_url = (
                f"/app/organizations/{share_link.organization_id}"
                f"/projects/{share_link.project_id}/media/{media.id}?commentId={comment.id}"
            )
            await notification_service.create_notification(
                user_id=media.created_by_user_id,
                organization_id=share_link.organization_id,
                actor_id=share_link.created_by_user_id,
                type=NotificationType.COMMENT_REPLY,
                title=f"{guest_author} commented on {media.title}",
                message=f'"{payload.content[:140]}"',
                link_url=link_url,
                metadata_json={
                    "project_id": str(share_link.project_id),
                    "media_id": str(media.id),
                    "comment_id": str(comment.id),
                    "is_guest": True,
                },
            )

        return resp

    @router.post(
        "/{token}/decisions",
        response_model=MediaDecisionResponse,
        status_code=status.HTTP_201_CREATED,
        operation_id="create_public_guest_decision",
    )
    async def create_public_guest_decision(
        token: str,
        payload: GuestDecisionRequest,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        event_publisher: Annotated[
            RealtimeEventPublisher | None,
            Depends(event_publisher_provider or (lambda: None)),
        ] = None,
        notification_service: Annotated[
            NotificationService | None,
            Depends(notification_service_provider or (lambda: None)),
        ] = None,
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> MediaDecisionResponse:
        share_link, media = await _resolve_share(token, media_repository)
        if not _verify_passphrase(share_link, x_share_passphrase):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Passphrase required")
        if not share_link.allow_approval:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Approvals disabled for link")

        guest_author = f"{payload.guest_name.strip()} (Guest)"
        decision = MediaReviewDecision(
            id=uuid4(),
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=media.id,
            user_id=share_link.created_by_user_id,
            status=payload.status,
            notes=payload.notes,
            created_at=utc_now(),
            user_name=guest_author,
        )

        saved = await media_repository.record_decision(decision)
        await media_repository.update_review_status(
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=media.id,
            status=payload.status,
            reviewed_by_user_id=None,
        )

        if event_publisher:
            ev_payload = {
                "media_id": str(media.id),
                "project_id": str(share_link.project_id),
                "status": payload.status,
                "notes": payload.notes,
                "user_name": guest_author,
                "created_at": saved.created_at.isoformat(),
            }
            await event_publisher.publish(
                RealtimeEvent(
                    event_type="decision.updated",
                    room=f"media:{media.id}",
                    payload=ev_payload,
                )
            )
            await event_publisher.publish(
                RealtimeEvent(
                    event_type="decision.updated",
                    room=f"project:{share_link.project_id}",
                    payload=ev_payload,
                )
            )

        if notification_service and media.created_by_user_id:
            labels = {"approved": "Approved", "needs_changes": "Needs Changes", "pending": "Pending"}
            lbl = labels.get(payload.status, payload.status)
            notes_sfx = f': "{payload.notes}"' if payload.notes else ""
            await notification_service.create_notification(
                user_id=media.created_by_user_id,
                organization_id=share_link.organization_id,
                actor_id=share_link.created_by_user_id,
                type=NotificationType.REVIEW_DECISION,
                title=f"{guest_author} set review status to {lbl}",
                message=f'Guest review decision for "{media.title}" was updated to {lbl}{notes_sfx}',
                link_url=f"/app/organizations/{share_link.organization_id}/projects/{share_link.project_id}/media/{media.id}",
                metadata_json={"media_id": str(media.id), "status": payload.status, "is_guest": True},
            )

        return MediaDecisionResponse(
            id=saved.id,
            organization_id=saved.organization_id,
            project_id=saved.project_id,
            media_id=saved.media_id,
            user_id=saved.user_id,
            user_name=guest_author,
            status=saved.status,
            notes=saved.notes,
            created_at=saved.created_at,
        )

    @router.get("/{token}/download", operation_id="get_public_share_download")
    async def get_public_share_download(
        token: str,
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        x_share_passphrase: Annotated[str | None, Header(alias="X-Share-Passphrase")] = None,
    ) -> dict[str, str]:
        share_link, media = await _resolve_share(token, media_repository)
        if not _verify_passphrase(share_link, x_share_passphrase):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Passphrase required")
        if not share_link.allow_download:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Downloads disabled for link")

        download_url = await storage.generate_presigned_view_url(
            media.storage_key, expires_in=3600
        )
        return {"download_url": download_url, "filename": media.filename}

    return router
