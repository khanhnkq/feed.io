from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from feedio.modules.comments.domain.errors import InvalidCommentContentError
from feedio.shared.infrastructure.persistence import utc_now

MAX_COMMENT_CONTENT_LENGTH = 5000


@dataclass(frozen=True, slots=True)
class MediaComment:
    id: UUID
    organization_id: UUID
    project_id: UUID
    media_id: UUID
    user_id: UUID
    parent_comment_id: UUID | None
    timestamp_seconds: float | None
    frame_number: int | None
    content: str
    annotation_data: dict[str, object] | None
    status: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    author_name: str | None = None
    author_email: str | None = None
    author_avatar_url: str | None = None

    @classmethod
    def create(
        cls,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        user_id: UUID,
        content: str,
        parent_comment_id: UUID | None = None,
        timestamp_seconds: float | None = None,
        frame_number: int | None = None,
        annotation_data: dict[str, object] | None = None,
    ) -> "MediaComment":
        cleaned_content = content.strip()
        if not cleaned_content:
            raise InvalidCommentContentError("Comment content cannot be empty")
        if len(cleaned_content) > MAX_COMMENT_CONTENT_LENGTH:
            raise InvalidCommentContentError(
                f"Comment content cannot exceed {MAX_COMMENT_CONTENT_LENGTH} characters"
            )

        now = utc_now()
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            user_id=user_id,
            parent_comment_id=parent_comment_id,
            timestamp_seconds=timestamp_seconds if timestamp_seconds is not None and timestamp_seconds >= 0 else None,
            frame_number=frame_number if frame_number is not None and frame_number >= 0 else None,
            content=cleaned_content,
            annotation_data=annotation_data,
            status="open",
            created_at=now,
            updated_at=now,
            deleted_at=None,
        )

    def update_content(self, content: str) -> "MediaComment":
        cleaned_content = content.strip()
        if not cleaned_content:
            raise InvalidCommentContentError("Comment content cannot be empty")
        if len(cleaned_content) > MAX_COMMENT_CONTENT_LENGTH:
            raise InvalidCommentContentError(
                f"Comment content cannot exceed {MAX_COMMENT_CONTENT_LENGTH} characters"
            )
        return MediaComment(
            id=self.id,
            organization_id=self.organization_id,
            project_id=self.project_id,
            media_id=self.media_id,
            user_id=self.user_id,
            parent_comment_id=self.parent_comment_id,
            timestamp_seconds=self.timestamp_seconds,
            frame_number=self.frame_number,
            content=cleaned_content,
            annotation_data=self.annotation_data,
            status=self.status,
            created_at=self.created_at,
            updated_at=utc_now(),
            deleted_at=self.deleted_at,
        )

    def set_status(self, status: str) -> "MediaComment":
        if status not in {"open", "resolved"}:
            status = "open"
        return MediaComment(
            id=self.id,
            organization_id=self.organization_id,
            project_id=self.project_id,
            media_id=self.media_id,
            user_id=self.user_id,
            parent_comment_id=self.parent_comment_id,
            timestamp_seconds=self.timestamp_seconds,
            frame_number=self.frame_number,
            content=self.content,
            annotation_data=self.annotation_data,
            status=status,
            created_at=self.created_at,
            updated_at=utc_now(),
            deleted_at=self.deleted_at,
        )
