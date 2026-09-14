from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.media.domain.entities import (
    MediaAsset,
    MediaReviewDecision,
)
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.modules.media.infrastructure.models import (
    MediaAssetTable,
    MediaReviewDecisionTable,
)
from feedio.shared.infrastructure.persistence import utc_now


class ReviewDecisionRepositoryMixin:
    _session: AsyncSession

    def _to_domain(
        self,
        record: MediaAssetTable,
        version_count: int = 1,
    ) -> MediaAsset:
        raise NotImplementedError

    async def record_decision(
        self,
        decision: MediaReviewDecision,
    ) -> MediaReviewDecision:
        record = MediaReviewDecisionTable(
            id=decision.id,
            organization_id=decision.organization_id,
            project_id=decision.project_id,
            media_id=decision.media_id,
            user_id=decision.user_id,
            guest_name=decision.guest_name,
            status=decision.status,
            notes=decision.notes,
            created_at=decision.created_at,
        )
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return MediaReviewDecision(
            id=record.id,
            organization_id=record.organization_id,
            project_id=record.project_id,
            media_id=record.media_id,
            user_id=record.user_id,
            guest_name=record.guest_name,
            status=record.status,
            notes=record.notes,
            created_at=record.created_at,
            user_name=decision.user_name or record.guest_name,
        )

    async def list_decisions(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        limit: int = 50,
    ) -> list[MediaReviewDecision]:
        query = (
            select(MediaReviewDecisionTable, col(UserTable.display_name))
            .outerjoin(UserTable, col(MediaReviewDecisionTable.user_id) == col(UserTable.id))
            .where(
                col(MediaReviewDecisionTable.organization_id) == organization_id,
                col(MediaReviewDecisionTable.project_id) == project_id,
                col(MediaReviewDecisionTable.media_id) == media_id,
            )
            .order_by(col(MediaReviewDecisionTable.created_at).desc())
            .limit(limit)
        )
        result = await self._session.execute(query)
        items: list[MediaReviewDecision] = []
        for decision_row, display_name in result.all():
            items.append(
                MediaReviewDecision(
                    id=decision_row.id,
                    organization_id=decision_row.organization_id,
                    project_id=decision_row.project_id,
                    media_id=decision_row.media_id,
                    user_id=decision_row.user_id,
                    guest_name=decision_row.guest_name,
                    status=decision_row.status,
                    notes=decision_row.notes,
                    created_at=decision_row.created_at,
                    user_name=decision_row.guest_name or display_name,
                )
            )
        return items

    async def update_review_status(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
        reviewed_by_user_id: UUID | None,
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
            raise MediaNotFoundError(f"Media {media_id} not found")

        record.review_status = status
        record.reviewed_by_user_id = reviewed_by_user_id
        record.reviewed_at = utc_now()
        record.updated_at = utc_now()

        await self._session.commit()
        await self._session.refresh(record)
        return self._to_domain(record)
