from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import MediaComment
from feedio.modules.comments.infrastructure.models import MediaCommentTable
from feedio.modules.identity.infrastructure.models import UserTable
from feedio.shared.infrastructure.persistence import utc_now


class SqlCommentRepository(CommentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(
        self,
        table: MediaCommentTable,
        user: UserTable | None = None,
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
            author_name=user.display_name if user else None,
            author_email=user.email if user else None,
            author_avatar_url=user.avatar_url if user else None,
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
            select(MediaCommentTable, UserTable)
            .outerjoin(UserTable, MediaCommentTable.user_id == UserTable.id)
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
        return self._to_domain(row[0], row[1]) if row else None

    async def list_by_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[MediaComment]:
        stmt = (
            select(MediaCommentTable, UserTable)
            .outerjoin(UserTable, MediaCommentTable.user_id == UserTable.id)
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
        return [self._to_domain(table, user) for table, user in rows]

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
