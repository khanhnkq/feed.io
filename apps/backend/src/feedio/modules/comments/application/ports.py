from typing import Protocol
from uuid import UUID

from feedio.modules.comments.domain.entities import MediaComment


class CommentRepository(Protocol):
    async def create(self, comment: MediaComment) -> MediaComment:
        ...

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> MediaComment | None:
        ...

    async def list_by_media(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[MediaComment]:
        ...

    async def update(self, comment: MediaComment) -> MediaComment:
        ...

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
    ) -> None:
        ...
