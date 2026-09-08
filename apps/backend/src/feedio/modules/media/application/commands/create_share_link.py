import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import ShareLink
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.shared.infrastructure.persistence import utc_now


class CreateShareLink:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        created_by_user_id: UUID,
        passphrase: str | None = None,
        expires_in_days: int = 7,
        allow_comments: bool = True,
        allow_approval: bool = True,
        allow_download: bool = False,
    ) -> tuple[ShareLink, str]:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError(f"Media {media_id} not found")

        if expires_in_days is None or expires_in_days < 1:
            raise ValueError("expires_in_days is required and must be at least 1")

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        passphrase_hash = None
        if passphrase and passphrase.strip():
            passphrase_hash = hashlib.sha256(passphrase.strip().encode()).hexdigest()

        expires_at = datetime.now(UTC) + timedelta(days=expires_in_days)

        now = utc_now()
        share_link = ShareLink(
            id=uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            folder_id=None,
            created_by_user_id=created_by_user_id,
            token_hash=token_hash,
            passphrase_hash=passphrase_hash,
            allow_comments=allow_comments,
            allow_approval=allow_approval,
            allow_download=allow_download,
            expires_at=expires_at,
            access_count=0,
            is_revoked=False,
            created_at=now,
            updated_at=now,
        )

        saved = await self._repository.create_share_link(share_link)
        return saved, raw_token
