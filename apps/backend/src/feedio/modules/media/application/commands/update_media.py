from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset


class UpdateMedia:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        title: str,
    ) -> MediaAsset:
        clean_title = title.strip()
        if not clean_title:
            clean_title = "Untitled Video"
        return await self._repository.update_metadata(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            title=clean_title,
        )
