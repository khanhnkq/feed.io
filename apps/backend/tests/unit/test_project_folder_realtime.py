from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.domain.entities import Folder, Project
from feedio.modules.projects.presentation.router import create_projects_router


@pytest.mark.asyncio
async def test_folder_crud_dispatches_realtime_events():
    org_id = uuid4()
    proj_id = uuid4()
    folder_id = uuid4()
    user_id = uuid4()

    mock_project_repo = AsyncMock()
    mock_publisher = AsyncMock()

    mock_project_repo.get_by_id.return_value = Project(
        id=proj_id,
        organization_id=org_id,
        name="Project Realtime",
        description="",
        created_at=datetime.now(UTC),
    )

    now = datetime.now(UTC)
    mock_folder = Folder(
        id=folder_id,
        organization_id=org_id,
        project_id=proj_id,
        parent_id=None,
        name="Rough Cuts",
        created_at=now,
        updated_at=now,
    )
    mock_project_repo.add_folder.return_value = mock_folder
    mock_project_repo.get_folder_by_id.return_value = mock_folder
    mock_project_repo.rename_folder.return_value = Folder(
        id=folder_id,
        organization_id=org_id,
        project_id=proj_id,
        parent_id=None,
        name="Final Cuts",
        created_at=now,
        updated_at=now,
    )
    mock_project_repo.move_folder.return_value = Folder(
        id=folder_id,
        organization_id=org_id,
        project_id=proj_id,
        parent_id=uuid4(),
        name="Final Cuts",
        created_at=now,
        updated_at=now,
    )

    app = FastAPI()

    async def override_context():
        return OrganizationContext(
            organization_id=org_id,
            user_id=user_id,
            role=OrganizationRole.ADMIN,
        )

    router = create_projects_router(
        repository_provider=lambda: mock_project_repo,
        organization_context_provider=override_context,
        event_publisher_provider=lambda: mock_publisher,
    )
    app.include_router(router, prefix="/api/v1")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Folder
        resp_create = await client.post(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/folders",
            json={"name": "Rough Cuts", "parent_id": None},
        )
        assert resp_create.status_code == 201
        assert mock_publisher.publish.call_count == 1
        create_event = mock_publisher.publish.call_args[0][0]
        assert create_event.event_type == "folder.created"
        assert create_event.room == f"project:{proj_id}"
        assert create_event.payload["folder"]["name"] == "Rough Cuts"

        # 2. Rename Folder
        mock_publisher.reset_mock()
        resp_rename = await client.patch(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/folders/{folder_id}",
            json={"name": "Final Cuts"},
        )
        assert resp_rename.status_code == 200
        assert mock_publisher.publish.call_count == 1
        rename_event = mock_publisher.publish.call_args[0][0]
        assert rename_event.event_type == "folder.updated"
        assert rename_event.room == f"project:{proj_id}"
        assert rename_event.payload["name"] == "Final Cuts"

        # 3. Move Folder
        mock_publisher.reset_mock()
        target_parent = uuid4()
        resp_move = await client.post(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/folders/{folder_id}/move",
            json={"new_parent_id": str(target_parent)},
        )
        assert resp_move.status_code == 200
        assert mock_publisher.publish.call_count == 1
        move_event = mock_publisher.publish.call_args[0][0]
        assert move_event.event_type == "folder.moved"
        assert move_event.room == f"project:{proj_id}"

        # 4. Delete Folder
        mock_publisher.reset_mock()
        resp_delete = await client.delete(
            f"/api/v1/organizations/{org_id}/projects/{proj_id}/folders/{folder_id}",
        )
        assert resp_delete.status_code == 204
        assert mock_publisher.publish.call_count == 1
        delete_event = mock_publisher.publish.call_args[0][0]
        assert delete_event.event_type == "folder.deleted"
        assert delete_event.room == f"project:{proj_id}"
        assert delete_event.payload["folder_id"] == str(folder_id)
