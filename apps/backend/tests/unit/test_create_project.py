from uuid import uuid4

import pytest

from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.domain.errors import InvalidProjectNameError
from tests.fakes import InMemoryProjectRepository


async def test_create_project_normalizes_name() -> None:
    repository = InMemoryProjectRepository()

    project = await CreateProject(repository).execute(uuid4(), "  Campaign launch  ")

    assert project.name == "Campaign launch"
    assert repository.projects == [project]


async def test_create_project_rejects_empty_name() -> None:
    with pytest.raises(InvalidProjectNameError):
        await CreateProject(InMemoryProjectRepository()).execute(uuid4(), "   ")
