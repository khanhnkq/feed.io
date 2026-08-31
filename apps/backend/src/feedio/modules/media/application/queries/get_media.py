from dataclasses import dataclass
from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError


@dataclass(frozen=True, slots=True)
class MediaStreamResult:
    media: MediaAsset
    stream_url: str


class GetMedia:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
    ) -> None:
        self._repository = repository
        self._storage = storage

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaStreamResult:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError("Media asset not found")

        stream_url = await self._storage.generate_presigned_view_url(
            storage_key=media.storage_key,
            expires_in=7200,
        )
        return MediaStreamResult(media=media, stream_url=stream_url)
