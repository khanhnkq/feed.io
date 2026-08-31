from uuid import UUID

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.domain.entities import MediaComment
from feedio.modules.comments.domain.errors import (
    CommentAccessDeniedError,
    CommentNotFoundError,
)


class UpdateComment:
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
        content: str | None = None,
        status: str | None = None,
        annotation_data: dict[str, object] | None = None,
    ) -> MediaComment:
        comment = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            comment_id=comment_id,
        )
        if not comment:
            raise CommentNotFoundError("Comment not found")

        # Resolving/reopening is allowed by any project member/admin
        # Editing content requires being the original author or admin
        if content is not None and comment.user_id != user_id and not is_admin:
            raise CommentAccessDeniedError("Cannot edit another user's comment")

        updated = comment
        if content is not None:
            updated = updated.update_content(content)
        if status is not None:
            updated = updated.set_status(status)

        return await self._repository.update(updated)
