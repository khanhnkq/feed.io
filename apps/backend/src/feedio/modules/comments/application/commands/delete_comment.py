from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.errors import (
    CommentAccessDeniedError,
    CommentNotFoundError,
)


class DeleteComment:
    def __init__(self, repository: CommentRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        comment_id: UUID,
        user_id: UUID,
        is_admin: bool = False,
    ) -> None:
        comment = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            comment_id=comment_id,
        )
        if not comment:
            raise CommentNotFoundError("Comment not found")

        if comment.user_id != user_id and not is_admin:
            raise CommentAccessDeniedError("Cannot delete another user's comment")

        await self._repository.soft_delete(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            comment_id=comment_id,
        )
