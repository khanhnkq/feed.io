import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.organizations.infrastructure.access_repository import (
    SqlOrganizationAccessRepository,
)
from feedio.modules.organizations.infrastructure.models import (
    OrganizationMemberTable,
    OrganizationTable,
)
from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository
from feedio.modules.projects.domain.entities import Project
from feedio.modules.projects.infrastructure.models import ProjectTable
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository

DATABASE_URL = os.getenv("FEEDIO_INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="integration database is not configured"),
]


async def test_workspace_creation_persists_parent_before_owner_membership() -> None:
    assert DATABASE_URL is not None
    engine = create_async_engine(DATABASE_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    user_email = f"workspace-owner-{uuid4()}@feedio.test"
    organization_id: UUID | None = None

    try:
        async with sessions() as session:
            user = UserTable(
                email=user_email,
                password_hash="integration-test-only",
                display_name="Workspace Owner",
                status="active",
                email_verified_at=func.now(),
            )
            session.add(user)
            await session.commit()

            workspace = await SqlOrganizationRepository(session).create_owner_workspace(
                user_id=user.id,
                name="Integration Workspace",
            )
            organization_id = workspace.id
            membership = await session.scalar(
                select(OrganizationMemberTable).where(
                    OrganizationMemberTable.organization_id == workspace.id,
                    OrganizationMemberTable.user_id == user.id,
                )
            )

            assert membership is not None
            assert membership.role == "owner"
    finally:
        async with sessions() as cleanup:
            if organization_id is not None:
                await cleanup.execute(
                    delete(OrganizationMemberTable).where(
                        OrganizationMemberTable.organization_id == organization_id
                    )
                )
                await cleanup.execute(
                    delete(OrganizationTable).where(OrganizationTable.id == organization_id)
                )
            await cleanup.execute(delete(UserTable).where(UserTable.email == user_email))
            await cleanup.commit()
        await engine.dispose()


async def test_user_cannot_select_another_organizations_projects() -> None:
    assert DATABASE_URL is not None
    engine = create_async_engine(DATABASE_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    organization_a = OrganizationTable(name="Agency A", slug=f"agency-a-{uuid4()}")
    organization_b = OrganizationTable(name="Agency B", slug=f"agency-b-{uuid4()}")
    user_email = f"integration-{uuid4()}@feedio.test"
    created_project_ids: list[UUID] = []

    try:
        async with sessions() as session:
            user = UserTable(
                email=user_email,
                password_hash="integration-test-only",
                display_name="Integration User",
                status="active",
                email_verified_at=func.now(),
            )
            session.add(user)
            await session.commit()
            session.add_all([organization_a, organization_b])
            await session.commit()
            session.add(
                OrganizationMemberTable(
                    organization_id=organization_a.id,
                    user_id=user.id,
                    role="member",
                )
            )
            await session.commit()

            project_repository = SqlProjectRepository(session)
            project_a = await project_repository.add(Project.create(organization_a.id, "A"))
            project_b = await project_repository.add(Project.create(organization_b.id, "B"))
            created_project_ids.extend([project_a.id, project_b.id])

            access_repository = SqlOrganizationAccessRepository(session)
            context = await access_repository.find_active_membership(organization_a.id, user.id)
            assert context is not None
            await access_repository.set_tenant_context(context)
            tenant_setting = await session.scalar(
                select(func.current_setting("app.current_organization_id", True))
            )
            visible_projects = await project_repository.list_for_organization(organization_a.id)
            forbidden_context = await access_repository.find_active_membership(
                organization_b.id,
                user.id,
            )

            assert tenant_setting == str(organization_a.id)
            assert [project.name for project in visible_projects] == ["A"]
            assert forbidden_context is None
    finally:
        async with sessions() as cleanup:
            await cleanup.execute(
                delete(ProjectTable).where(ProjectTable.id.in_(created_project_ids))
            )
            await cleanup.execute(
                delete(OrganizationMemberTable).where(
                    OrganizationMemberTable.organization_id.in_(
                        [organization_a.id, organization_b.id]
                    )
                )
            )
            await cleanup.execute(
                delete(OrganizationTable).where(
                    OrganizationTable.id.in_([organization_a.id, organization_b.id])
                )
            )
            await cleanup.execute(
                delete(UserTable).where(UserTable.email == user_email)
            )
            await cleanup.commit()
        await engine.dispose()
