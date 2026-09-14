from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import (
    InvalidVersionOperationError,
    MediaNotFoundError,
)
from feedio.modules.media.infrastructure.models import MediaAssetTable
from feedio.shared.infrastructure.persistence import utc_now


class SqlMediaVersionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_versions(
        self,
        organization_id: UUID,
        project_id: UUID,
        version_group_id: UUID,
    ) -> list[MediaAsset]:
        query = (
            select(MediaAssetTable)
            .where(
                col(MediaAssetTable.organization_id) == organization_id,
                col(MediaAssetTable.project_id) == project_id,
                col(MediaAssetTable.version_group_id) == version_group_id,
                col(MediaAssetTable.deleted_at).is_(None),
            )
            .order_by(col(MediaAssetTable.version_number).asc())
        )
        result = await self._session.execute(query)
        records = list(result.scalars().all())
        total_count = len(records)
        return [self._to_domain(r, version_count=total_count) for r in records]

    async def stack_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        target_media_id: UUID,
        source_media_id: UUID,
        version_label: str | None = None,
    ) -> tuple[MediaAsset, MediaAsset]:
        if target_media_id == source_media_id:
            raise InvalidVersionOperationError("Cannot stack a media asset with itself")

        target_q = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == target_media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        source_q = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == source_media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )

        target = (await self._session.execute(target_q)).scalar_one_or_none()
        source = (await self._session.execute(source_q)).scalar_one_or_none()

        if not target or not source:
            raise MediaNotFoundError("One or both media assets not found")

        if (
            target.version_group_id is not None
            and target.version_group_id == source.version_group_id
        ):
            raise InvalidVersionOperationError(
                "Media assets are already in the same version stack"
            )

        now = utc_now()
        group_id = target.version_group_id or uuid4()

        if target.version_group_id is None:
            target.version_group_id = group_id
            target.version_number = 1
            target.is_primary_version = False
            target.updated_at = now

        max_v_q = select(
            func.coalesce(func.max(MediaAssetTable.version_number), 1)
        ).where(
            col(MediaAssetTable.version_group_id) == group_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        max_v = (await self._session.execute(max_v_q)).scalar_one()

        existing_versions = await self.list_versions_records(group_id)
        for v in existing_versions:
            v.is_primary_version = False
            v.updated_at = now

        source.version_group_id = group_id
        source.version_number = int(max_v) + 1
        if version_label:
            source.version_label = version_label.strip()
        source.is_primary_version = True
        source.updated_at = now

        await self._session.commit()
        await self._session.refresh(target)
        await self._session.refresh(source)

        total_count = len(existing_versions) + 1
        return (
            self._to_domain(target, version_count=total_count),
            self._to_domain(source, version_count=total_count),
        )

    async def unstack_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        record = (await self._session.execute(query)).scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")

        if record.version_group_id is None:
            raise InvalidVersionOperationError(
                "Media asset is not part of a version stack"
            )

        old_group_id = record.version_group_id
        was_primary = record.is_primary_version
        now = utc_now()

        record.version_group_id = None
        record.version_number = 1
        record.version_label = None
        record.is_primary_version = True
        record.updated_at = now

        if was_primary:
            remaining_q = (
                select(MediaAssetTable)
                .where(
                    col(MediaAssetTable.version_group_id) == old_group_id,
                    col(MediaAssetTable.id) != record.id,
                    col(MediaAssetTable.deleted_at).is_(None),
                )
                .order_by(col(MediaAssetTable.version_number).desc())
            )
            remaining = list((await self._session.execute(remaining_q)).scalars().all())
            if remaining:
                remaining[0].is_primary_version = True
                remaining[0].updated_at = now

        await self._session.commit()
        await self._session.refresh(record)
        return self._to_domain(record, version_count=1)

    async def set_primary_version(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        record = (await self._session.execute(query)).scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")

        now = utc_now()
        if record.version_group_id:
            group_records = await self.list_versions_records(record.version_group_id)
            for r in group_records:
                r.is_primary_version = r.id == record.id
                r.updated_at = now
            total_count = len(group_records)
        else:
            record.is_primary_version = True
            record.updated_at = now
            total_count = 1

        await self._session.commit()
        await self._session.refresh(record)
        return self._to_domain(record, version_count=total_count)

    async def update_version_label(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        version_label: str | None,
    ) -> MediaAsset:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.organization_id) == organization_id,
            col(MediaAssetTable.project_id) == project_id,
            col(MediaAssetTable.id) == media_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        record = (await self._session.execute(query)).scalar_one_or_none()
        if not record:
            raise MediaNotFoundError("Media asset not found")

        record.version_label = version_label.strip() if version_label else None
        record.updated_at = utc_now()
        await self._session.commit()
        await self._session.refresh(record)

        version_count = 1
        if record.version_group_id:
            group_records = await self.list_versions_records(record.version_group_id)
            version_count = len(group_records)

        return self._to_domain(record, version_count=version_count)

    async def list_versions_records(
        self, version_group_id: UUID
    ) -> list[MediaAssetTable]:
        query = select(MediaAssetTable).where(
            col(MediaAssetTable.version_group_id) == version_group_id,
            col(MediaAssetTable.deleted_at).is_(None),
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    def _to_domain(
        self, record: MediaAssetTable, version_count: int = 1
    ) -> MediaAsset:
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
            version_group_id=record.version_group_id,
            version_number=record.version_number,
            version_label=record.version_label,
            is_primary_version=record.is_primary_version,
            version_count=version_count,
            review_status=record.review_status,
            reviewed_by_user_id=record.reviewed_by_user_id,
            reviewed_at=record.reviewed_at,
            created_at=record.created_at,
            updated_at=record.updated_at,
            deleted_at=record.deleted_at,
        )
