from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset
from feedio.shared.domain.pagination import Page


class ListMedia:
    def __init__(self, repository: MediaRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID | None = None,
        include_subfolders: bool = False,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[MediaAsset]:
        return await self._repository.list_by_location(
            organization_id=organization_id,
            project_id=project_id,
            folder_id=folder_id,
            include_subfolders=include_subfolders,
            cursor=cursor,
            limit=limit,
        )
