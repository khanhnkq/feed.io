from typing import Protocol
from uuid import UUID

from feedio.modules.comments.domain.entities import (
    IssuesSummary,
    MediaComment,
    ProjectIssue,
)


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

    async def list_by_project(
        self,
        organization_id: UUID,
        project_id: UUID,
        status: str | None = None,
        media_id: UUID | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ProjectIssue], int]:
        ...

    async def get_issues_summary(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID | None = None,
    ) -> IssuesSummary:
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

