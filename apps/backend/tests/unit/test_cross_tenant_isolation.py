from uuid import uuid4

import pytest

from feedio.modules.media.application.commands.presign_media_upload import PresignMediaUpload
from feedio.modules.media.application.queries.get_media import GetMedia
from feedio.modules.media.application.queries.list_media import ListMedia
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.modules.organizations.application.list_invitations import (
    ListOrganizationInvitations,
)
from feedio.modules.organizations.application.list_members import ListOrganizationMembers
from feedio.modules.organizations.application.list_user_organizations import (
    ListUserOrganizations,
)
from feedio.modules.organizations.domain.errors import InsufficientRolePermissionError
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.application.commands.create_folder import CreateFolder
from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.queries.get_folder import GetFolder
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.application.queries.list_folders import ListFolders
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.domain.errors import (
    FolderNotFoundError,
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)
from tests.fake_organizations import InMemoryOrganizationRepository
from tests.fakes import InMemoryProjectRepository
from tests.unit.test_media_service import InMemoryMediaRepository, InMemoryStorageService


@pytest.mark.asyncio
async def test_cross_tenant_project_isolation() -> None:
    repo = InMemoryProjectRepository()

    org_a = uuid4()
    org_b = uuid4()
    user_a = uuid4()
    user_b = uuid4()

    # Create project in Org A and Org B
    proj_a = await CreateProject(repo).execute(
        organization_id=org_a,
        name="Org A Secret Project",
        visibility="public",
        created_by_user_id=user_a,
    )
    proj_b = await CreateProject(repo).execute(
        organization_id=org_b,
        name="Org B Private Project",
        visibility="private",
        created_by_user_id=user_b,
    )

    list_qry = ListProjects(repo)

    # User in Org A only sees Org A projects
    org_a_projects = await list_qry.execute(
        organization_id=org_a,
        user_id=user_a,
        is_admin=True,
    )
    assert len(org_a_projects.items) == 1
    assert org_a_projects.items[0].id == proj_a.id

    # User in Org B only sees Org B projects
    org_b_projects = await list_qry.execute(
        organization_id=org_b,
        user_id=user_b,
        is_admin=True,
    )
    assert len(org_b_projects.items) == 1
    assert org_b_projects.items[0].id == proj_b.id

    # Querying Org A project with Org B organization_id returns None / ProjectNotFoundError
    get_qry = GetProject(repo)
    with pytest.raises(ProjectNotFoundError):
        await get_qry.execute(
            organization_id=org_b,
            project_id=proj_a.id,
            user_id=user_b,
            is_admin=True,
        )


@pytest.mark.asyncio
async def test_cross_tenant_folder_and_media_isolation() -> None:
    project_repo = InMemoryProjectRepository()
    media_repo = InMemoryMediaRepository()
    storage = InMemoryStorageService()

    org_a = uuid4()
    org_b = uuid4()
    user_a = uuid4()

    proj_a = await CreateProject(project_repo).execute(
        organization_id=org_a,
        name="Org A Media Space",
        created_by_user_id=user_a,
    )

    # Create folder in Org A
    folder_a = await CreateFolder(project_repo).execute(
        organization_id=org_a,
        project_id=proj_a.id,
        name="Org A Folder",
    )

    # Upload media to Org A
    upload_res = await PresignMediaUpload(media_repo, storage).execute(
        organization_id=org_a,
        project_id=proj_a.id,
        user_id=user_a,
        filename="asset.mp4",
        file_size_bytes=1024,
        mime_type="video/mp4",
        folder_id=folder_a.id,
    )
    media_id = upload_res.media.id

    # Org B cannot list folders of Org A project
    folders_in_b = await ListFolders(project_repo).execute(
        organization_id=org_b,
        project_id=proj_a.id,
    )
    assert len(folders_in_b.items) == 0

    # Org B cannot get folder of Org A
    with pytest.raises(FolderNotFoundError):
        await GetFolder(project_repo).execute(
            organization_id=org_b,
            project_id=proj_a.id,
            folder_id=folder_a.id,
        )

    # Org B cannot list media of Org A project
    media_in_b = await ListMedia(media_repo).execute(
        organization_id=org_b,
        project_id=proj_a.id,
    )
    assert len(media_in_b.items) == 0

    # Org B cannot get stream URL of Org A media
    with pytest.raises(MediaNotFoundError):
        await GetMedia(media_repo, storage).execute(
            organization_id=org_b,
            project_id=proj_a.id,
            media_id=media_id,
        )


@pytest.mark.asyncio
async def test_guest_user_project_visibility_isolation() -> None:
    repo = InMemoryProjectRepository()
    org_id = uuid4()
    admin_id = uuid4()
    guest_id = uuid4()
    other_guest_id = uuid4()

    # 1. Public project
    public_proj = await CreateProject(repo).execute(
        organization_id=org_id,
        name="Public Project",
        visibility="public",
        created_by_user_id=admin_id,
    )

    # 2. Private project shared with guest_id
    shared_private = await CreateProject(repo).execute(
        organization_id=org_id,
        name="Shared Private Project",
        visibility="private",
        created_by_user_id=admin_id,
    )
    await repo.add_project_member(
        organization_id=org_id,
        project_id=shared_private.id,
        user_id=guest_id,
        project_role="viewer",
    )

    # 3. Private project NOT shared with guest_id
    unshared_private = await CreateProject(repo).execute(
        organization_id=org_id,
        name="Secret Admin Project",
        visibility="private",
        created_by_user_id=admin_id,
    )

    list_qry = ListProjects(repo)
    get_qry = GetProject(repo)

    # Guest sees Public + Shared Private (2 total)
    guest_projects = await list_qry.execute(
        organization_id=org_id,
        user_id=guest_id,
        is_admin=False,
    )
    guest_pids = {p.id for p in guest_projects.items}
    assert guest_pids == {public_proj.id, shared_private.id}

    # Other guest (not invited to shared_private) only sees Public (1 total)
    other_projects = await list_qry.execute(
        organization_id=org_id,
        user_id=other_guest_id,
        is_admin=False,
    )
    assert len(other_projects.items) == 1
    assert other_projects.items[0].id == public_proj.id

    # Guest can read shared_private
    accessed = await get_qry.execute(
        organization_id=org_id,
        project_id=shared_private.id,
        user_id=guest_id,
        is_admin=False,
    )
    assert accessed.id == shared_private.id

    # Guest cannot read unshared_private -> ProjectAccessDeniedError
    with pytest.raises(ProjectAccessDeniedError):
        await get_qry.execute(
            organization_id=org_id,
            project_id=unshared_private.id,
            user_id=guest_id,
            is_admin=False,
        )


@pytest.mark.asyncio
async def test_cross_tenant_organization_members_and_invitations() -> None:
    org_repo = InMemoryOrganizationRepository()

    user_a = uuid4()
    user_b = uuid4()

    org_a = await org_repo.create_with_owner(user_id=user_a, name="Company A")
    org_b = await org_repo.create_with_owner(user_id=user_b, name="Company B")

    # User A listing their organizations only sees Company A
    user_a_orgs = await ListUserOrganizations(org_repo).execute(user_a)
    assert len(user_a_orgs.items) == 1
    assert user_a_orgs.items[0].id == org_a.id

    # Members in Org A are not in Org B
    members_a = await ListOrganizationMembers(org_repo).execute(org_a.id)
    assert len(members_a.items) == 1
    assert members_a.items[0].user_id == user_a

    members_b = await ListOrganizationMembers(org_repo).execute(org_b.id)
    assert len(members_b.items) == 1
    assert members_b.items[0].user_id == user_b

    # Non-admin context cannot view invitations
    member_ctx = OrganizationContext(org_a.id, user_a, OrganizationRole.MEMBER)
    with pytest.raises(InsufficientRolePermissionError):
        await ListOrganizationInvitations(org_repo).execute(member_ctx)
