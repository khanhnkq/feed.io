from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import MediaComment
from feedio.modules.comments.domain.errors import CommentNotFoundError
from feedio.shared.infrastructure.persistence import utc_now


class InMemoryCommentRepository(CommentRepository):
    def __init__(self) -> None:
        self.comments_by_id: dict[UUID, MediaComment] = {}

    async def create(self, comment: MediaComment) -> MediaComment:
        self.comments_by_id[comment.id] = comment
        return comment

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> MediaComment | None:
        comment = self.comments_by_id.get(comment_id)
        if (
            comment
            and comment.organization_id == organization_id
            and comment.project_id == project_id
            and comment.media_id == media_id
            and comment.deleted_at is None
        ):
            return comment
        return None

    async def list_by_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[MediaComment]:
        comments = [
            c
            for c in self.comments_by_id.values()
            if c.organization_id == organization_id
            and c.project_id == project_id
            and c.media_id == media_id
            and c.deleted_at is None
        ]
        return sorted(
            comments,
            key=lambda c: (
                c.timestamp_seconds if c.timestamp_seconds is not None else -1,
                c.created_at,
            ),
        )

    async def update(self, comment: MediaComment) -> MediaComment:
        self.comments_by_id[comment.id] = comment
        return comment

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> None:
        comment = await self.get_by_id(organization_id, project_id, media_id, comment_id)
        if not comment:
            raise CommentNotFoundError("Comment not found")
        deleted = MediaComment(
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
            updated_at=utc_now(),
            deleted_at=utc_now(),
        )
        self.comments_by_id[comment_id] = deleted
