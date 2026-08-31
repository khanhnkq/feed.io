import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.infrastructure.repository import SqlMediaRepository
from feedio.modules.organizations.domain.value_objects import OrganizationRole
from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository
from feedio.modules.projects.domain.entities import Folder, Project
from feedio.modules.projects.infrastructure.folder_repository import SqlFolderRepository
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository
from feedio.shared.infrastructure.persistence import utc_now

DATABASE_URL = os.getenv("FEEDIO_INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="integration database is not configured"),
]


@pytest.mark.asyncio
async def test_postgres_cross_tenant_isolation() -> None:
    assert DATABASE_URL is not None
    engine = create_async_engine(DATABASE_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as session:
        # Create 2 users
        user_a = UserTable(
            email=f"tenant-a-{uuid4()}@feedio.test",
            password_hash="test-pass",
            display_name="User A",
            status="active",
            email_verified_at=func.now(),
        )
        user_b = UserTable(
            email=f"tenant-b-{uuid4()}@feedio.test",
            password_hash="test-pass",
            display_name="User B",
            status="active",
            email_verified_at=func.now(),
        )
        session.add(user_a)
        session.add(user_b)
        await session.commit()

        org_repo = SqlOrganizationRepository(session)
        project_repo = SqlProjectRepository(session)
        folder_repo = SqlFolderRepository(session)
        media_repo = SqlMediaRepository(session)

        # Create Org A and Org B
        org_a = await org_repo.create_with_owner(user_id=user_a.id, name="Tenant A Corp")
        org_b = await org_repo.create_with_owner(user_id=user_b.id, name="Tenant B Corp")

        # Create Project in Org A
        proj_a = Project(
            id=uuid4(),
            organization_id=org_a.id,
            name="Project A Secret",
            description="Tenant A only",
            visibility="private",
            created_at=utc_now(),
        )
        await project_repo.add(proj_a, created_by_user_id=user_a.id)

        # Create Folder in Org A
        folder_a = Folder(
            id=uuid4(),
            organization_id=org_a.id,
            project_id=proj_a.id,
            name="Raw Footages",
            parent_id=None,
            created_at=utc_now(),
        )
        await folder_repo.add_folder(folder_a)

        # Create Media Asset in Org A
        media_a = MediaAsset(
            id=uuid4(),
            organization_id=org_a.id,
            project_id=proj_a.id,
            folder_id=folder_a.id,
            title="Interview Raw",
            storage_key=f"organizations/{org_a.id}/projects/{proj_a.id}/{uuid4()}.mp4",
            file_size_bytes=2048,
            mime_type="video/mp4",
            duration_seconds=120.0,
            status="ready",
            created_at=utc_now(),
            uploaded_by_user_id=user_a.id,
        )
        await media_repo.create(media_a)

        # 1. Projects isolation in DB
        projects_b = await project_repo.list_for_organization(org_b.id, user_id=user_b.id, is_admin=True)
        assert len(projects_b.items) == 0

        project_in_b = await project_repo.get(org_b.id, proj_a.id)
        assert project_in_b is None

        # 2. Folders isolation in DB
        folders_b = await folder_repo.list_folders(org_b.id, proj_a.id)
        assert len(folders_b.items) == 0

        folder_in_b = await folder_repo.get_folder(org_b.id, proj_a.id, folder_a.id)
        assert folder_in_b is None

        # 3. Media isolation in DB
        media_b = await media_repo.list_by_location(org_b.id, proj_a.id, folder_id=folder_a.id)
        assert len(media_b.items) == 0

        media_in_b = await media_repo.get_by_id(org_b.id, proj_a.id, media_a.id)
        assert media_in_b is None

        # 4. Members & Invitations isolation in DB
        members_b = await org_repo.list_members(org_b.id)
        assert len(members_b.items) == 1
        assert members_b.items[0].user_id == user_b.id
