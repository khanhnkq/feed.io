from uuid import uuid4

import pytest

from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.commands.delete_project import DeleteProject
from feedio.modules.projects.application.commands.update_project import UpdateProject
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import (
    InvalidProjectNameError,
    ProjectNotFoundError,
)
from tests.fakes import InMemoryProjectRepository


async def test_create_project_normalizes_name() -> None:
    repository = InMemoryProjectRepository()

    project = await CreateProject(repository).execute(uuid4(), "  Campaign launch  ")

    assert project.name == "Campaign launch"
    assert repository.projects == [project]


async def test_create_project_rejects_empty_name() -> None:
    with pytest.raises(InvalidProjectNameError):
        await CreateProject(InMemoryProjectRepository()).execute(uuid4(), "   ")


async def test_get_project_success() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project = await CreateProject(repository).execute(org_id, "Feature Film")

    fetched = await GetProject(repository).execute(org_id, project.id)
    assert fetched.id == project.id
    assert fetched.name == "Feature Film"


async def test_get_project_not_found() -> None:
    repository = InMemoryProjectRepository()
    with pytest.raises(ProjectNotFoundError):
        await GetProject(repository).execute(uuid4(), uuid4())


async def test_update_project_success() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project = await CreateProject(repository).execute(org_id, "Old Name", "Old Desc")

    updated = await UpdateProject(repository).execute(
        organization_id=org_id,
        project_id=project.id,
        name="New Name",
        description="New Desc",
    )
    assert updated.name == "New Name"
    assert updated.description == "New Desc"

    fetched = await GetProject(repository).execute(org_id, project.id)
    assert fetched.name == "New Name"
    assert fetched.description == "New Desc"


async def test_update_project_invalid_name() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project = await CreateProject(repository).execute(org_id, "Valid Name")

    with pytest.raises(InvalidProjectNameError):
        await UpdateProject(repository).execute(
            organization_id=org_id,
            project_id=project.id,
            name="   ",
        )


async def test_delete_project_success() -> None:
    repository = InMemoryProjectRepository()
    org_id = uuid4()
    project = await CreateProject(repository).execute(org_id, "To Delete")

    await DeleteProject(repository).execute(org_id, project.id)
    assert len(repository.projects) == 0

    with pytest.raises(ProjectNotFoundError):
        await GetProject(repository).execute(org_id, project.id)


async def test_delete_project_not_found() -> None:
    repository = InMemoryProjectRepository()
    with pytest.raises(ProjectNotFoundError):
        await DeleteProject(repository).execute(uuid4(), uuid4())
