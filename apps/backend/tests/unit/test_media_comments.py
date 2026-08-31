from uuid import uuid4

import pytest

from feedio.modules.comments.application.commands.create_comment import CreateComment
from feedio.modules.comments.application.commands.delete_comment import DeleteComment
from feedio.modules.comments.application.commands.update_comment import UpdateComment
from feedio.modules.comments.application.queries.list_media_comments import ListMediaComments
from feedio.modules.comments.domain.errors import (
    CommentAccessDeniedError,
    CommentNotFoundError,
    InvalidCommentContentError,
)
from tests.comments_fakes import InMemoryCommentRepository


@pytest.mark.asyncio
async def test_create_and_list_timecoded_comments() -> None:
    repo = InMemoryCommentRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    user_id = uuid4()

    create_cmd = CreateComment(repo)
    c1 = await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=user_id,
        content="Fix color grading at 01:23",
        timestamp_seconds=83.5,
        frame_number=2004,
        annotation_data={"type": "arrow", "points": [100, 100, 200, 200]},
    )

    assert c1.content == "Fix color grading at 01:23"
    assert c1.timestamp_seconds == 83.5
    assert c1.frame_number == 2004
    assert c1.status == "open"

    # Create a reply thread
    c2 = await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=user_id,
        content="Working on this in next cut!",
        parent_comment_id=c1.id,
    )
    assert c2.parent_comment_id == c1.id

    # List comments
    comments = await ListMediaComments(repo).execute(org_id, proj_id, media_id)
    assert len(comments) == 2


@pytest.mark.asyncio
async def test_create_comment_empty_content_raises() -> None:
    repo = InMemoryCommentRepository()
    create_cmd = CreateComment(repo)
    with pytest.raises(InvalidCommentContentError):
        await create_cmd.execute(
            organization_id=uuid4(),
            project_id=uuid4(),
            media_id=uuid4(),
            user_id=uuid4(),
            content="   ",
        )


@pytest.mark.asyncio
async def test_update_comment_status_and_content() -> None:
    repo = InMemoryCommentRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    author_id = uuid4()
    other_user_id = uuid4()

    c = await CreateComment(repo).execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=author_id,
        content="Initial note",
    )

    update_cmd = UpdateComment(repo)

    # Resolving status is permitted
    resolved = await update_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        comment_id=c.id,
        user_id=other_user_id,
        status="resolved",
    )
    assert resolved.status == "resolved"

    # Editing text by other non-admin user is rejected
    with pytest.raises(CommentAccessDeniedError):
        await update_cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            media_id=media_id,
            comment_id=c.id,
            user_id=other_user_id,
            is_admin=False,
            content="Hijacked text",
        )

    # Author can edit text
    edited = await update_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        comment_id=c.id,
        user_id=author_id,
        content="Updated note content",
    )
    assert edited.content == "Updated note content"


@pytest.mark.asyncio
async def test_delete_comment_permissions() -> None:
    repo = InMemoryCommentRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    author_id = uuid4()
    other_id = uuid4()

    c = await CreateComment(repo).execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        user_id=author_id,
        content="Will be deleted",
    )

    delete_cmd = DeleteComment(repo)

    with pytest.raises(CommentAccessDeniedError):
        await delete_cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            media_id=media_id,
            comment_id=c.id,
            user_id=other_id,
            is_admin=False,
        )

    # Author deletes
    await delete_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        comment_id=c.id,
        user_id=author_id,
    )

    # Confirm deleted
    assert await repo.get_by_id(org_id, proj_id, media_id, c.id) is None
