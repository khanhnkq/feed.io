from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import MediaComment
from feedio.modules.comments.domain.errors import CommentNotFoundError


class CreateComment:
    def __init__(self, repository: CommentRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        user_id: UUID,
        content: str,
        parent_comment_id: UUID | None = None,
        timestamp_seconds: float | None = None,
        frame_number: int | None = None,
        annotation_data: dict[str, object] | None = None,
    ) -> MediaComment:
        if parent_comment_id:
            parent = await self._repository.get_by_id(
                organization_id=organization_id,
                project_id=project_id,
                media_id=media_id,
                comment_id=parent_comment_id,
            )
            if not parent:
                raise CommentNotFoundError("Parent comment not found")

        comment = MediaComment.create(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            user_id=user_id,
            content=content,
            parent_comment_id=parent_comment_id,
            timestamp_seconds=timestamp_seconds,
            frame_number=frame_number,
            annotation_data=annotation_data,
        )
        return await self._repository.create(comment)
