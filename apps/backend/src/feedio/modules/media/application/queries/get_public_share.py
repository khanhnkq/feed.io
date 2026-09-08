import hashlib
from datetime import UTC, datetime

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset, ShareLink
from feedio.modules.media.domain.errors import (
    MediaNotFoundError,
    ShareLinkExpiredError,
    ShareLinkNotFoundError,
    ShareLinkRevokedError,
)


class GetPublicShare:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        raw_token: str,
    ) -> tuple[ShareLink, MediaAsset]:
        token_hash = hashlib.sha256(raw_token.strip().encode()).hexdigest()
        share_link = await self._repository.get_share_link_by_token_hash(token_hash)
        if not share_link:
            raise ShareLinkNotFoundError("Share link not found or invalid token")

        if share_link.is_revoked:
            raise ShareLinkRevokedError("This share link has been revoked")

        if share_link.expires_at and share_link.expires_at < datetime.now(UTC):
            raise ShareLinkExpiredError("This share link has expired")

        if not share_link.media_id:
            raise MediaNotFoundError("Shared asset not found")

        media = await self._repository.get_by_id(
            organization_id=share_link.organization_id,
            project_id=share_link.project_id,
            media_id=share_link.media_id,
        )
        if not media or media.deleted_at is not None:
            raise MediaNotFoundError("Shared media asset no longer exists")

        await self._repository.increment_share_link_access_count(share_link.id)
        return share_link, media
