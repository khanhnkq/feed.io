from uuid import uuid4

import pytest

from feedio.modules.projects.application.commands.add_project_member import AddProjectMember
from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.commands.remove_project_member import (
    RemoveProjectMember,
)
from feedio.modules.projects.application.commands.update_project_member_role import (
    UpdateProjectMemberRole,
)
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.application.queries.list_project_members import (
    ListProjectMembers,
)
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.domain.errors import (
    InvalidProjectRoleError,
    ProjectAccessDeniedError,
    UserAlreadyProjectMemberError,
)
from tests.fakes import InMemoryProjectRepository


@pytest.mark.asyncio
async def test_public_project_visible_to_all_members() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    user_id = uuid4()

    create_cmd = CreateProject(repo)
    await create_cmd.execute(
        organization_id=org_id,
        name="Public Campaign",
        visibility="public",
    )

    list_qry = ListProjects(repo)
    projects = await list_qry.execute(
        organization_id=org_id,
        user_id=user_id,
        is_admin=False,
    )
    assert len(projects) == 1
    assert projects[0].name == "Public Campaign"
    assert projects[0].visibility == "public"


@pytest.mark.asyncio
async def test_private_project_hidden_from_non_members() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    creator_id = uuid4()
    other_member_id = uuid4()

    create_cmd = CreateProject(repo)
    private_project = await create_cmd.execute(
        organization_id=org_id,
        name="Confidential Project",
        visibility="private",
        created_by_user_id=creator_id,
    )

    list_qry = ListProjects(repo)
    # Non-member shouldn't see it
    other_projects = await list_qry.execute(
        organization_id=org_id,
        user_id=other_member_id,
        is_admin=False,
    )
    assert len(other_projects) == 0

    # Non-member direct access denied
    get_qry = GetProject(repo)
    with pytest.raises(ProjectAccessDeniedError):
        await get_qry.execute(
            organization_id=org_id,
            project_id=private_project.id,
            user_id=other_member_id,
            is_admin=False,
        )

    # Admin always sees it
    admin_projects = await list_qry.execute(
        organization_id=org_id,
        user_id=other_member_id,
        is_admin=True,
    )
    assert len(admin_projects) == 1


@pytest.mark.asyncio
async def test_add_and_remove_project_member() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    creator_id = uuid4()
    collaborator_id = uuid4()

    create_cmd = CreateProject(repo)
    project = await create_cmd.execute(
        organization_id=org_id,
        name="Secret Video Cut",
        visibility="private",
        created_by_user_id=creator_id,
    )

    add_cmd = AddProjectMember(repo)
    member = await add_cmd.execute(
        organization_id=org_id,
        project_id=project.id,
        target_user_id=collaborator_id,
        project_role="editor",
        actor_user_id=creator_id,
        is_admin=True,
    )
    assert member.user_id == collaborator_id
    assert member.project_role == "editor"

    # Now collaborator can see and access the private project
    list_qry = ListProjects(repo)
    projects = await list_qry.execute(
        organization_id=org_id,
        user_id=collaborator_id,
        is_admin=False,
    )
    assert len(projects) == 1

    # Update role
    update_cmd = UpdateProjectMemberRole(repo)
    await update_cmd.execute(
        organization_id=org_id,
        project_id=project.id,
        target_user_id=collaborator_id,
        new_role="viewer",
        is_admin=True,
    )
    assert await repo.get_user_project_role(project.id, collaborator_id) == "viewer"

    # Duplicate add raises error
    with pytest.raises(UserAlreadyProjectMemberError):
        await add_cmd.execute(
            organization_id=org_id,
            project_id=project.id,
            target_user_id=collaborator_id,
            project_role="viewer",
            is_admin=True,
        )

    # Remove member
    remove_cmd = RemoveProjectMember(repo)
    await remove_cmd.execute(
        organization_id=org_id,
        project_id=project.id,
        target_user_id=collaborator_id,
        is_admin=True,
    )
    assert not await repo.is_user_project_member(project.id, collaborator_id)


@pytest.mark.asyncio
async def test_list_project_members() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    user_id = uuid4()

    project = await CreateProject(repo).execute(
        organization_id=org_id,
        name="Private Workspace",
        visibility="private",
    )
    await AddProjectMember(repo).execute(
        organization_id=org_id,
        project_id=project.id,
        target_user_id=user_id,
        project_role="editor",
        is_admin=True,
    )

    members = await ListProjectMembers(repo).execute(
        organization_id=org_id,
        project_id=project.id,
        user_id=user_id,
        is_admin=False,
    )
    assert len(members) == 1
    assert members[0].user_id == user_id


@pytest.mark.asyncio
async def test_invalid_project_role() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    project = await CreateProject(repo).execute(
        organization_id=org_id,
        name="Test",
    )

    add_cmd = AddProjectMember(repo)
    with pytest.raises(InvalidProjectRoleError):
        await add_cmd.execute(
            organization_id=org_id,
            project_id=project.id,
            target_user_id=uuid4(),
            project_role="invalid_role",
            is_admin=True,
        )
