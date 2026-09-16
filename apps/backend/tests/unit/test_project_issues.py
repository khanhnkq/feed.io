from uuid import uuid4

import pytest

from feedio.modules.comments.application.commands.create_comment import CreateComment
from feedio.modules.comments.application.commands.update_comment import UpdateComment
from tests.comments_fakes import InMemoryCommentRepository


@pytest.mark.asyncio
async def test_project_issues_listing_and_filtering() -> None:
    repo = InMemoryCommentRepository()
    org_id = uuid4()
    proj_id = uuid4()
    media_1 = uuid4()
    media_2 = uuid4()
    user_id = uuid4()

    create_cmd = CreateComment(repo)

    # Issue 1 on Media 1 (Open)
    i1 = await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_1,
        user_id=user_id,
        content="Fix audio glitch at 00:15",
        timestamp_seconds=15.0,
        frame_number=360,
    )

    # Issue 2 on Media 1 (Resolved)
    i2 = await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_1,
        user_id=user_id,
        content="Typo in subtitle",
        timestamp_seconds=30.0,
    )
    await UpdateComment(repo).execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_1,
        comment_id=i2.id,
        user_id=user_id,
        status="resolved",
    )

    # Issue 3 on Media 2 (Open)
    i3 = await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_2,
        user_id=user_id,
        content="Color grading too dark",
        timestamp_seconds=45.0,
    )

    # Reply to Issue 1 (should NOT be returned as an issue)
    await create_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_1,
        user_id=user_id,
        content="Got it, will fix.",
        parent_comment_id=i1.id,
    )

    # 1. List all issues for project (should return 3 root issues, ignoring the reply)
    all_issues, total = await repo.list_by_project(org_id, proj_id)
    assert total == 3
    assert len(all_issues) == 3

    # Check that issue 1 has replies_count = 1
    issue_1 = next(item for item in all_issues if item.id == i1.id)
    assert issue_1.replies_count == 1

    # 2. Filter by open
    open_issues, open_total = await repo.list_by_project(org_id, proj_id, status="open")
    assert open_total == 2
    assert {i.id for i in open_issues} == {i1.id, i3.id}

    # 3. Filter by resolved
    resolved_issues, res_total = await repo.list_by_project(
        org_id, proj_id, status="resolved"
    )
    assert res_total == 1
    assert resolved_issues[0].id == i2.id

    # 4. Filter by media_id
    m2_issues, m2_total = await repo.list_by_project(org_id, proj_id, media_id=media_2)
    assert m2_total == 1
    assert m2_issues[0].id == i3.id

    # 5. Search text
    search_issues, search_total = await repo.list_by_project(
        org_id, proj_id, search="audio"
    )
    assert search_total == 1
    assert search_issues[0].id == i1.id

    # 6. Summary metrics
    summary = await repo.get_issues_summary(org_id, proj_id)
    assert summary.total == 3
    assert summary.open == 2
    assert summary.resolved == 1


def test_project_issues_api_endpoints() -> None:
    from fastapi import FastAPI
    from starlette.testclient import TestClient

    from feedio.modules.comments.presentation.issues_router import (
        create_project_issues_router,
    )
    from feedio.modules.organizations.domain.value_objects import (
        OrganizationContext,
        OrganizationRole,
    )
    from feedio.modules.projects.domain.entities import Project
    from feedio.shared.infrastructure.persistence import utc_now
    from tests.fakes import InMemoryProjectRepository

    comment_repo = InMemoryCommentRepository()
    project_repo = InMemoryProjectRepository()

    org_id = uuid4()
    proj_id = uuid4()
    user_id = uuid4()

    # Seed project
    project = Project(
        id=proj_id,
        organization_id=org_id,
        name="Commercial Cut",
        description="Q4 ad",
        visibility="public",
        created_at=utc_now(),
    )
    project_repo.projects.append(project)

    app = FastAPI()

    async def get_test_context() -> OrganizationContext:
        return OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        )

    router = create_project_issues_router(
        comment_repository_provider=lambda: comment_repo,
        project_repository_provider=lambda: project_repo,
        organization_context_provider=get_test_context,
    )
    app.include_router(router, prefix="/api/v1")

    client = TestClient(app)

    # 1. Test get summary on empty
    res = client.get(f"/api/v1/organizations/{org_id}/projects/{proj_id}/issues/summary")
    assert res.status_code == 200
    assert res.json() == {"total": 0, "open": 0, "resolved": 0}

    # 2. Test get issues list on empty
    res_list = client.get(f"/api/v1/organizations/{org_id}/projects/{proj_id}/issues")
    assert res_list.status_code == 200
    assert res_list.json() == {"items": [], "total": 0}

