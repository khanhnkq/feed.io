from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from feedio.modules.media.domain.entities import ShareLink
from feedio.modules.media.domain.errors import ShareLinkNotFoundError
from feedio.modules.media.infrastructure.models import ShareLinkTable
from feedio.shared.infrastructure.persistence import utc_now


class ShareLinkRepositoryMixin:
    _session: AsyncSession

    async def create_share_link(
        self,
        share_link: ShareLink,
    ) -> ShareLink:
        record = ShareLinkTable(
            id=share_link.id,
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=share_link.media_id,
            folder_id=share_link.folder_id,
            created_by_user_id=share_link.created_by_user_id,
            token_hash=share_link.token_hash,
            passphrase_hash=share_link.passphrase_hash,
            allow_comments=share_link.allow_comments,
            allow_approval=share_link.allow_approval,
            allow_download=share_link.allow_download,
            expires_at=share_link.expires_at,
            access_count=share_link.access_count,
            is_revoked=share_link.is_revoked,
            created_at=share_link.created_at,
            updated_at=share_link.updated_at,
        )
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return self._share_link_to_domain(record)

    async def get_share_link_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        share_link_id: UUID,
    ) -> ShareLink | None:
        query = select(ShareLinkTable).where(
            col(ShareLinkTable.organization_id) == organization_id,
            col(ShareLinkTable.project_id) == project_id,
            col(ShareLinkTable.id) == share_link_id,
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        return self._share_link_to_domain(record) if record else None

    async def get_share_link_by_token_hash(
        self,
        token_hash: str,
    ) -> ShareLink | None:
        query = select(ShareLinkTable).where(
            col(ShareLinkTable.token_hash) == token_hash,
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        return self._share_link_to_domain(record) if record else None

    async def list_share_links(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[ShareLink]:
        query = (
            select(ShareLinkTable)
            .where(
                col(ShareLinkTable.organization_id) == organization_id,
                col(ShareLinkTable.project_id) == project_id,
                col(ShareLinkTable.media_id) == media_id,
            )
            .order_by(col(ShareLinkTable.created_at).desc())
        )
        result = await self._session.execute(query)
        records = list(result.scalars().all())
        return [self._share_link_to_domain(r) for r in records]

    async def revoke_share_link(
        self,
        organization_id: UUID,
        project_id: UUID,
        share_link_id: UUID,
    ) -> ShareLink:
        query = select(ShareLinkTable).where(
            col(ShareLinkTable.organization_id) == organization_id,
            col(ShareLinkTable.project_id) == project_id,
            col(ShareLinkTable.id) == share_link_id,
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if not record:
            raise ShareLinkNotFoundError(f"Share link {share_link_id} not found")

        record.is_revoked = True
        record.updated_at = utc_now()
        await self._session.commit()
        await self._session.refresh(record)
        return self._share_link_to_domain(record)

    async def increment_share_link_access_count(
        self,
        share_link_id: UUID,
    ) -> None:
        query = select(ShareLinkTable).where(
            col(ShareLinkTable.id) == share_link_id,
        )
        result = await self._session.execute(query)
        record = result.scalar_one_or_none()
        if record:
            record.access_count += 1
            record.updated_at = utc_now()
            await self._session.commit()

    def _share_link_to_domain(self, record: ShareLinkTable) -> ShareLink:
        return ShareLink(
            id=record.id,
            organization_id=record.organization_id,
            project_id=record.project_id,
            media_id=record.media_id,
            folder_id=record.folder_id,
            created_by_user_id=record.created_by_user_id,
            token_hash=record.token_hash,
            passphrase_hash=record.passphrase_hash,
            allow_comments=record.allow_comments,
            allow_approval=record.allow_approval,
            allow_download=record.allow_download,
            expires_at=record.expires_at,
            access_count=record.access_count,
            is_revoked=record.is_revoked,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
