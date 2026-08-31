from uuid import uuid4

import pytest

from feedio.modules.projects.application.commands.create_folder import CreateFolder
from feedio.modules.projects.application.commands.delete_folder import DeleteFolder
from feedio.modules.projects.application.commands.move_folder import MoveFolder
from feedio.modules.projects.application.commands.rename_folder import RenameFolder
from feedio.modules.projects.application.queries.get_folder import GetFolder
from feedio.modules.projects.application.queries.get_folder_breadcrumbs import (
    GetFolderBreadcrumbs,
)
from feedio.modules.projects.application.queries.get_folder_tree import GetFolderTree
from feedio.modules.projects.application.queries.list_folders import ListFolders
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderCycleError,
    FolderNotFoundError,
    InvalidFolderNameError,
)
from tests.fakes import InMemoryProjectRepository


async def test_create_folder_at_root() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    folder = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="  Cuts V1  ",
        parent_id=None,
    )

    assert folder.name == "Cuts V1"
    assert folder.parent_id is None
    assert folder.organization_id == org_id
    assert folder.project_id == project_id

    folders = await ListFolders(repository).execute(org_id, project_id)
    assert len(folders.items) == 1
    assert folders.items[0].id == folder.id


async def test_create_nested_folder_and_breadcrumbs() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    root_folder = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Season 1",
    )

    sub_folder = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Episode 01",
        parent_id=root_folder.id,
    )

    deep_folder = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Raw Audio",
        parent_id=sub_folder.id,
    )

    breadcrumbs = await GetFolderBreadcrumbs(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        folder_id=deep_folder.id,
    )

    assert [b.name for b in breadcrumbs] == ["Season 1", "Episode 01", "Raw Audio"]
    assert [b.id for b in breadcrumbs] == [root_folder.id, sub_folder.id, deep_folder.id]


async def test_reject_duplicate_folder_name_in_same_parent() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Renders",
    )

    with pytest.raises(DuplicateFolderNameError):
        await CreateFolder(repository).execute(
            organization_id=org_id,
            project_id=project_id,
            name="renders",
        )


async def test_rename_folder_success_and_duplicate_rejection() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    f1 = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Drafts",
    )
    await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Final",
    )

    renamed = await RenameFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        folder_id=f1.id,
        new_name="Work In Progress",
    )
    assert renamed.name == "Work In Progress"

    with pytest.raises(DuplicateFolderNameError):
        await RenameFolder(repository).execute(
            organization_id=org_id,
            project_id=project_id,
            folder_id=f1.id,
            new_name="final",
        )


async def test_delete_folder_cascades_to_children() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    parent = await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="Archive",
    )
    await CreateFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        name="2025",
        parent_id=parent.id,
    )

    await DeleteFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        folder_id=parent.id,
    )

    root_list = await ListFolders(repository).execute(org_id, project_id)
    assert root_list.items == []

    child_list = await ListFolders(repository).execute(org_id, project_id, parent_id=parent.id)
    assert child_list.items == []

    deleted_parent = await repository.get_folder(org_id, project_id, parent.id)
    assert deleted_parent is None


async def test_reject_invalid_folder_name() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    with pytest.raises(InvalidFolderNameError):
        await CreateFolder(repository).execute(
            organization_id=org_id,
            project_id=project_id,
            name="   ",
        )

    with pytest.raises(InvalidFolderNameError):
        await CreateFolder(repository).execute(
            organization_id=org_id,
            project_id=project_id,
            name="a" * 121,
        )


async def test_get_folder_and_tree() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    root = await CreateFolder(repository).execute(org_id, project_id, "Root A")
    child = await CreateFolder(repository).execute(org_id, project_id, "Child A", parent_id=root.id)

    fetched = await GetFolder(repository).execute(org_id, project_id, root.id)
    assert fetched.id == root.id
    assert fetched.name == "Root A"

    with pytest.raises(FolderNotFoundError):
        await GetFolder(repository).execute(org_id, project_id, uuid4())

    tree = await GetFolderTree(repository).execute(org_id, project_id)
    assert len(tree) == 2
    assert {f.id for f in tree} == {root.id, child.id}


async def test_move_folder_success() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    f1 = await CreateFolder(repository).execute(org_id, project_id, "Folder 1")
    f2 = await CreateFolder(repository).execute(org_id, project_id, "Folder 2")
    sub = await CreateFolder(repository).execute(org_id, project_id, "Sub", parent_id=f1.id)

    # Move sub from f1 to f2
    moved = await MoveFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        folder_id=sub.id,
        new_parent_id=f2.id,
    )
    assert moved.parent_id == f2.id

    # Move sub to root
    moved_root = await MoveFolder(repository).execute(
        organization_id=org_id,
        project_id=project_id,
        folder_id=sub.id,
        new_parent_id=None,
    )
    assert moved_root.parent_id is None


async def test_move_folder_cycle_prevention() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    root = await CreateFolder(repository).execute(org_id, project_id, "Root")
    child = await CreateFolder(repository).execute(org_id, project_id, "Child", parent_id=root.id)
    grandchild = await CreateFolder(repository).execute(
        org_id, project_id, "Grandchild", parent_id=child.id
    )

    # Cannot move into itself
    with pytest.raises(FolderCycleError):
        await MoveFolder(repository).execute(org_id, project_id, root.id, root.id)

    # Cannot move into child
    with pytest.raises(FolderCycleError):
        await MoveFolder(repository).execute(org_id, project_id, root.id, child.id)

    # Cannot move into grandchild
    with pytest.raises(FolderCycleError):
        await MoveFolder(repository).execute(org_id, project_id, root.id, grandchild.id)


async def test_move_folder_duplicate_rejection() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project_id = uuid4()

    target = await CreateFolder(repository).execute(org_id, project_id, "Target")
    await CreateFolder(repository).execute(org_id, project_id, "Assets", parent_id=target.id)
    source = await CreateFolder(repository).execute(org_id, project_id, "Assets")

    with pytest.raises(DuplicateFolderNameError):
        await MoveFolder(repository).execute(org_id, project_id, source.id, target.id)
