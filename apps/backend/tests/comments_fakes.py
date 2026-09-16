from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import (
    IssuesSummary,
    MediaComment,
    ProjectIssue,
)
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

    async def list_by_project(
        self,
        organization_id: UUID,
        project_id: UUID,
        status: str | None = None,
        media_id: UUID | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ProjectIssue], int]:
        all_issues: list[ProjectIssue] = []
        for c in self.comments_by_id.values():
            if c.organization_id != organization_id or c.project_id != project_id:
                continue
            if c.parent_comment_id is not None or c.deleted_at is not None:
                continue
            if status and c.status != status:
                continue
            if media_id and c.media_id != media_id:
                continue
            if search and search.strip() and search.strip().lower() not in c.content.lower():
                continue

            replies = sum(
                1
                for r in self.comments_by_id.values()
                if r.parent_comment_id == c.id and r.deleted_at is None
            )
            all_issues.append(
                ProjectIssue(
                    id=c.id,
                    organization_id=c.organization_id,
                    project_id=c.project_id,
                    media_id=c.media_id,
                    media_title="Sample Media",
                    media_type="video",
                    media_thumbnail_storage_key=None,
                    media_storage_key=None,
                    media_mime_type="video/mp4",
                    media_version_number=1,
                    user_id=c.user_id,
                    author_name=c.author_name,
                    author_email=c.author_email,
                    author_avatar_url=c.author_avatar_url,
                    parent_comment_id=c.parent_comment_id,
                    timestamp_seconds=c.timestamp_seconds,
                    frame_number=c.frame_number,
                    content=c.content,
                    annotation_data=c.annotation_data,
                    status=c.status,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                    replies_count=replies,
                )
            )
        all_issues.sort(key=lambda x: x.created_at, reverse=True)
        total = len(all_issues)
        return all_issues[offset : offset + limit], total

    async def get_issues_summary(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID | None = None,
    ) -> IssuesSummary:
        root_comments = [
            c
            for c in self.comments_by_id.values()
            if c.organization_id == organization_id
            and c.project_id == project_id
            and c.parent_comment_id is None
            and c.deleted_at is None
            and (media_id is None or c.media_id == media_id)
        ]
        total = len(root_comments)
        open_count = sum(1 for c in root_comments if c.status == "open")
        resolved_count = sum(1 for c in root_comments if c.status == "resolved")
        return IssuesSummary(total=total, open=open_count, resolved=resolved_count)

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
