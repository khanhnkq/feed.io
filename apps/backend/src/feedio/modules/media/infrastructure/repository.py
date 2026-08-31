from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.modules.media.infrastructure.models import MediaAssetTable
from feedio.shared.domain.pagination import Page
from feedio.shared.infrastructure.pagination import decode_cursor, encode_cursor
from feedio.shared.infrastructure.persistence import utc_now


class SqlMediaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, media: MediaAsset) -> MediaAsset:
        record = MediaAssetTable(
            id=media.id,
            organization_id=media.organization_id,
            project_id=media.project_id,
            folder_id=media.folder_id,
            created_by_user_id=media.created_by_user_id,
            title=media.title,
            filename=media.filename,
            file_size_bytes=media.file_size_bytes,
            mime_type=media.mime_type,
            storage_key=media.storage_key,
            status=media.status,
            duration_seconds=media.duration_seconds,
            width=media.width,
            height=media.height,
            thumbnail_storage_key=media.thumbnail_storage_key,
            created_at=media.created_at,
            updated_at=media.updated_at,
            deleted_at=media.deleted_at,
        )
        self._session.add(record)
        await self._session.commit()
        return self._to_domain(record)

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset | None:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        return self._to_domain(record) if record else None

    async def list_by_location(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[MediaAsset]:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.folder_id) == folder_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )

        if cursor:
            decoded = decode_cursor(cursor)
            if decoded:
                cur_created_at, cur_id = decoded
                query = query.where(
                    or_(
                        col(MediaAssetTable.created_at) < cur_created_at,
                        and_(
                            col(MediaAssetTable.created_at) == cur_created_at,
                            col(MediaAssetTable.id) < cur_id,
                        ),
                    )
                )

        query = query.order_by(
            col(MediaAssetTable.created_at).desc(),
            col(MediaAssetTable.id).desc(),
        ).limit(limit + 1)

        result = await self._session.execute(query)
        records = list(result.scalars().all())
        has_more = len(records) > limit
        page_records = records[:limit]
        items = [self._to_domain(r) for r in page_records]
        next_cursor = (
            encode_cursor(page_records[-1].created_at, page_records[-1].id)
            if has_more and page_records
            else None
        )
        return Page(items=items, next_cursor=next_cursor, has_more=has_more)

    async def update_status(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")
        record.status = status
        record.updated_at = utc_now()
        await self._session.commit()
        return self._to_domain(record)

    async def update_metadata(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        title: str,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")
        record.title = title
        record.updated_at = utc_now()
        await self._session.commit()
        return self._to_domain(record)

    async def move(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        target_folder_id: UUID | None,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")
        record.folder_id = target_folder_id
        record.updated_at = utc_now()
        await self._session.commit()
        return self._to_domain(record)

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> None:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")
        record.deleted_at = utc_now()
        await self._session.commit()

    async def update_transcode_result(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
        duration_seconds: float | None = None,
        width: int | None = None,
        height: int | None = None,
        fps: float | None = None,
        thumbnail_storage_key: str | None = None,
        hls_storage_key: str | None = None,
        proxy_storage_key: str | None = None,
        filmstrip_storage_key: str | None = None,
        filmstrip_vtt_storage_key: str | None = None,
        waveform_data: str | None = None,
        error_message: str | None = None,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")
        record.status = status
        if duration_seconds is not None:
            record.duration_seconds = duration_seconds
        if width is not None:
            record.width = width
        if height is not None:
            record.height = height
        if fps is not None:
            record.fps = fps
        if thumbnail_storage_key is not None:
            record.thumbnail_storage_key = thumbnail_storage_key
        if hls_storage_key is not None:
            record.hls_storage_key = hls_storage_key
        if proxy_storage_key is not None:
            record.proxy_storage_key = proxy_storage_key
        if filmstrip_storage_key is not None:
            record.filmstrip_storage_key = filmstrip_storage_key
        if filmstrip_vtt_storage_key is not None:
            record.filmstrip_vtt_storage_key = filmstrip_vtt_storage_key
        if waveform_data is not None:
            record.waveform_data = waveform_data
        if error_message is not None:
            record.error_message = error_message
        record.updated_at = utc_now()
        await self._session.commit()
        return self._to_domain(record)

    async def get_organization_storage_usage_bytes(
        self,
        organization_id: UUID,
    ) -> int:
        query = select(
            func.coalesce(func.sum(MediaAssetTable.file_size_bytes), 0)
        ).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        usage = result.scalar_one()
        return int(usage)

    async def list_incomplete_multipart_uploads(
        self,
        older_than: datetime,
    ) -> list[MediaAsset]:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.status) == "uploading",
            col(MediaAssetTable.created_at) < older_than,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        records = list(result.scalars().all())
        return [self._to_domain(r) for r in records]

    def _to_domain(self, record: MediaAssetTable) -> MediaAsset:
        return MediaAsset(
            id=record.id,
            organization_id=record.organization_id,
            project_id=record.project_id,
            folder_id=record.folder_id,
            created_by_user_id=record.created_by_user_id,
            title=record.title,
            filename=record.filename,
            file_size_bytes=record.file_size_bytes,
            mime_type=record.mime_type,
            storage_key=record.storage_key,
            status=record.status,
            duration_seconds=record.duration_seconds,
            width=record.width,
            height=record.height,
            fps=record.fps,
            thumbnail_storage_key=record.thumbnail_storage_key,
            hls_storage_key=record.hls_storage_key,
            proxy_storage_key=record.proxy_storage_key,
            filmstrip_storage_key=record.filmstrip_storage_key,
            filmstrip_vtt_storage_key=record.filmstrip_vtt_storage_key,
            waveform_data=record.waveform_data,
            error_message=record.error_message,
            created_at=record.created_at,
            updated_at=record.updated_at,
            deleted_at=record.deleted_at,
        )
