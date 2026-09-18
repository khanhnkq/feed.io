from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import (
    IssuesSummary,
    MediaComment,
    ProjectIssue,
)
from feedio.modules.comments.infrastructure.models import MediaCommentTable
from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.media.infrastructure.models import MediaAssetTable
from feedio.modules.profiles.infrastructure.models import UserProfileTable
from feedio.shared.infrastructure.persistence import utc_now


class SqlCommentRepository(CommentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(
        self,
        table: MediaCommentTable,
        user: UserTable | None = None,
        profile: UserProfileTable | None = None,
    ) -> MediaComment:
        return MediaComment(
            id=table.id,
            organization_id=table.organization_id,
            project_id=table.project_id,
            media_id=table.media_id,
            user_id=table.user_id,
            parent_comment_id=table.parent_comment_id,
            timestamp_seconds=table.timestamp_seconds,
            frame_number=table.frame_number,
            content=table.content,
            annotation_data=table.annotation_data,
            status=table.status,
            created_at=table.created_at,
            updated_at=table.updated_at,
            deleted_at=table.deleted_at,
            author_name=(profile.display_name if profile else None) or (user.email if user else None),
            author_email=user.email if user else None,
            author_avatar_url=profile.avatar_url if profile else None,
        )

    def _to_table(self, domain: MediaComment) -> MediaCommentTable:
        return MediaCommentTable(
            id=domain.id,
            organization_id=domain.organization_id,
            project_id=domain.project_id,
            media_id=domain.media_id,
            user_id=domain.user_id,
            parent_comment_id=domain.parent_comment_id,
            timestamp_seconds=domain.timestamp_seconds,
            frame_number=domain.frame_number,
            content=domain.content,
            annotation_data=domain.annotation_data,
            status=domain.status,
            created_at=domain.created_at,
            updated_at=domain.updated_at,
            deleted_at=domain.deleted_at,
        )

    async def create(self, comment: MediaComment) -> MediaComment:
        table = self._to_table(comment)
        self._session.add(table)
        await self._session.flush()
        await self._session.refresh(table)
        await self._session.commit()
        return (
            await self.get_by_id(
                table.organization_id,
                table.project_id,
                table.media_id,
                table.id,
            )
            or self._to_domain(table)
        )

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> MediaComment | None:
        stmt = (
            select(MediaCommentTable, UserTable, UserProfileTable)
            .outerjoin(UserTable, MediaCommentTable.user_id == UserTable.id)
            .outerjoin(UserProfileTable, MediaCommentTable.user_id == UserProfileTable.user_id)
            .where(
                MediaCommentTable.organization_id == organization_id,
                MediaCommentTable.project_id == project_id,
                MediaCommentTable.media_id == media_id,
                MediaCommentTable.id == comment_id,
                MediaCommentTable.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        row = result.first()
        return self._to_domain(row[0], row[1], row[2]) if row else None

    async def list_by_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[MediaComment]:
        stmt = (
            select(MediaCommentTable, UserTable, UserProfileTable)
            .outerjoin(UserTable, MediaCommentTable.user_id == UserTable.id)
            .outerjoin(UserProfileTable, MediaCommentTable.user_id == UserProfileTable.user_id)
            .where(
                MediaCommentTable.organization_id == organization_id,
                MediaCommentTable.project_id == project_id,
                MediaCommentTable.media_id == media_id,
                MediaCommentTable.deleted_at.is_(None),
            )
            .order_by(
                MediaCommentTable.timestamp_seconds.asc().nulls_first(),
                MediaCommentTable.created_at.asc(),
            )
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [self._to_domain(table, user, profile) for table, user, profile in rows]

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
        reply_table = aliased(MediaCommentTable)
        replies_subquery = (
            select(func.count(reply_table.id))
            .where(
                reply_table.parent_comment_id == MediaCommentTable.id,
                reply_table.deleted_at.is_(None),
            )
            .scalar_subquery()
        )

        conditions = [
            MediaCommentTable.organization_id == organization_id,
            MediaCommentTable.project_id == project_id,
            MediaCommentTable.parent_comment_id.is_(None),
            MediaCommentTable.deleted_at.is_(None),
            MediaAssetTable.deleted_at.is_(None),
        ]
        if status:
            conditions.append(MediaCommentTable.status == status)
        if media_id:
            conditions.append(MediaCommentTable.media_id == media_id)
        if search and search.strip():
            conditions.append(MediaCommentTable.content.ilike(f"%{search.strip()}%"))

        count_stmt = (
            select(func.count(MediaCommentTable.id))
            .join(MediaAssetTable, MediaCommentTable.media_id == MediaAssetTable.id)
            .where(*conditions)
        )
        total_result = await self._session.execute(count_stmt)
        total = total_result.scalar_one_or_none() or 0

        stmt = (
            select(
                MediaCommentTable,
                UserTable,
                UserProfileTable,
                MediaAssetTable,
                replies_subquery.label("replies_count"),
            )
            .join(MediaAssetTable, MediaCommentTable.media_id == MediaAssetTable.id)
            .outerjoin(UserTable, MediaCommentTable.user_id == UserTable.id)
            .outerjoin(UserProfileTable, MediaCommentTable.user_id == UserProfileTable.user_id)
            .where(*conditions)
            .order_by(MediaCommentTable.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        issues: list[ProjectIssue] = []
        for comment_row, user_row, profile_row, media_row, rep_count in rows:
            media_type = (
                "image"
                if media_row.mime_type.lower().startswith("image/")
                else "video"
            )
            issues.append(
                ProjectIssue(
                    id=comment_row.id,
                    organization_id=comment_row.organization_id,
                    project_id=comment_row.project_id,
                    media_id=comment_row.media_id,
                    media_title=media_row.title,
                    media_type=media_type,
                    media_thumbnail_storage_key=media_row.thumbnail_storage_key,
                    media_storage_key=media_row.storage_key,
                    media_mime_type=media_row.mime_type,
                    media_version_number=media_row.version_number,
                    user_id=comment_row.user_id,
                    author_name=(profile_row.display_name if profile_row else None) or (user_row.email if user_row else None),
                    author_email=user_row.email if user_row else None,
                    author_avatar_url=profile_row.avatar_url if profile_row else None,
                    parent_comment_id=comment_row.parent_comment_id,
                    timestamp_seconds=comment_row.timestamp_seconds,
                    frame_number=comment_row.frame_number,
                    content=comment_row.content,
                    annotation_data=comment_row.annotation_data,
                    status=comment_row.status,
                    created_at=comment_row.created_at,
                    updated_at=comment_row.updated_at,
                    replies_count=rep_count or 0,
                )
            )
        return issues, total

    async def get_issues_summary(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID | None = None,
    ) -> IssuesSummary:
        conditions = [
            MediaCommentTable.organization_id == organization_id,
            MediaCommentTable.project_id == project_id,
            MediaCommentTable.parent_comment_id.is_(None),
            MediaCommentTable.deleted_at.is_(None),
            MediaAssetTable.deleted_at.is_(None),
        ]
        if media_id:
            conditions.append(MediaCommentTable.media_id == media_id)

        stmt = (
            select(
                func.count(MediaCommentTable.id).label("total"),
                func.count(MediaCommentTable.id)
                .filter(MediaCommentTable.status == "open")
                .label("open"),
                func.count(MediaCommentTable.id)
                .filter(MediaCommentTable.status == "resolved")
                .label("resolved"),
            )
            .join(MediaAssetTable, MediaCommentTable.media_id == MediaAssetTable.id)
            .where(*conditions)
        )
        result = await self._session.execute(stmt)
        row = result.first()
        if not row:
            return IssuesSummary(total=0, open=0, resolved=0)
        return IssuesSummary(
            total=row.total or 0,
            open=row.open or 0,
            resolved=row.resolved or 0,
        )

    async def update(self, comment: MediaComment) -> MediaComment:
        stmt = (
            update(MediaCommentTable)
            .where(
                MediaCommentTable.organization_id == comment.organization_id,
                MediaCommentTable.project_id == comment.project_id,
                MediaCommentTable.media_id == comment.media_id,
                MediaCommentTable.id == comment.id,
                MediaCommentTable.deleted_at.is_(None),
            )
            .values(
                content=comment.content,
                status=comment.status,
                annotation_data=comment.annotation_data,
                updated_at=comment.updated_at,
            )
        )
        await self._session.execute(stmt)
        await self._session.commit()
        return comment

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> None:
        stmt = (
            update(MediaCommentTable)
            .where(
                MediaCommentTable.organization_id == organization_id,
                MediaCommentTable.project_id == project_id,
                MediaCommentTable.media_id == media_id,
                MediaCommentTable.id == comment_id,
                MediaCommentTable.deleted_at.is_(None),
            )
            .values(deleted_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.commit()

