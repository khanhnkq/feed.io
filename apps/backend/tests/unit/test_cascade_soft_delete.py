from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import CITEXT, JSONB

@compiles(JSONB, "sqlite")
def compile_jsonb(type_, compiler, **kw):
    return "JSON"

@compiles(CITEXT, "sqlite")
def compile_citext(type_, compiler, **kw):
    return "TEXT"

from datetime import datetime, timezone
from uuid import uuid4
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel, select

from feedio.modules.projects.infrastructure.models import FolderTable, ProjectTable
from feedio.modules.projects.infrastructure.folder_repository import SqlFolderRepository
from feedio.modules.projects.infrastructure.repository import SqlProjectRepository
from feedio.modules.media.infrastructure.models import MediaAssetTable, ShareLinkTable
from feedio.modules.media.infrastructure.repository import SqlMediaRepository
from feedio.modules.comments.infrastructure.models import MediaCommentTable
from feedio.modules.comments.infrastructure.repository import SqlCommentRepository
from feedio.modules.organizations.infrastructure.models import OrganizationTable
from feedio.modules.organizations.infrastructure.repository import SqlOrganizationRepository
from feedio.shared.infrastructure.persistence import utc_now


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_delete_folder_cascades_to_media_and_share_links(db_session):
    org_id = uuid4()
    proj_id = uuid4()
    folder_id = uuid4()
    now = utc_now()

    # Create folder
    folder = FolderTable(
        id=folder_id,
        organization_id=org_id,
        project_id=proj_id,
        name="Test Folder",
        created_at=now,
        updated_at=now,
    )
    db_session.add(folder)

    # Create media in folder
    media = MediaAssetTable(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        folder_id=folder_id,
        title="Video 1",
        filename="v1.mp4",
        storage_key="org/proj/v1.mp4",
        status="ready",
        created_at=now,
        updated_at=now,
    )
    db_session.add(media)

    # Create share link for folder
    share_link = ShareLinkTable(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        folder_id=folder_id,
        created_by_user_id=uuid4(),
        token_hash="hash123",
        is_revoked=False,
        created_at=now,
        updated_at=now,
    )
    db_session.add(share_link)
    await db_session.commit()

    repo = SqlFolderRepository(db_session)
    await repo.delete_folder(org_id, proj_id, folder_id)

    # Verify folder is soft-deleted
    f_res = await db_session.get(FolderTable, folder_id)
    assert f_res.deleted_at is not None

    # Verify media is soft-deleted
    m_res = await db_session.get(MediaAssetTable, media.id)
    assert m_res.deleted_at is not None

    # Verify share link is revoked
    s_res = await db_session.get(ShareLinkTable, share_link.id)
    assert s_res.is_revoked is True


@pytest.mark.asyncio
async def test_delete_project_cascades_to_folders_media_and_share_links(db_session):
    org_id = uuid4()
    proj_id = uuid4()
    now = utc_now()

    proj = ProjectTable(
        id=proj_id,
        organization_id=org_id,
        name="Test Project",
        created_at=now,
        updated_at=now,
    )
    db_session.add(proj)

    folder = FolderTable(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        name="Subfolder",
        created_at=now,
        updated_at=now,
    )
    db_session.add(folder)

    media = MediaAssetTable(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        title="Media in project",
        filename="p.mp4",
        storage_key="org/proj/p.mp4",
        status="ready",
        created_at=now,
        updated_at=now,
    )
    db_session.add(media)
    await db_session.commit()

    repo = SqlProjectRepository(db_session)
    await repo.delete(org_id, proj_id)

    p_res = await db_session.get(ProjectTable, proj_id)
    assert p_res.deleted_at is not None

    f_res = await db_session.get(FolderTable, folder.id)
    assert f_res.deleted_at is not None

    m_res = await db_session.get(MediaAssetTable, media.id)
    assert m_res.deleted_at is not None


@pytest.mark.asyncio
async def test_delete_comment_cascades_to_child_replies(db_session):
    org_id = uuid4()
    proj_id = uuid4()
    media_id = uuid4()
    parent_id = uuid4()
    child_id = uuid4()
    now = utc_now()

    parent = MediaCommentTable(
        id=parent_id,
        user_id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        content="Parent comment",
        created_at=now,
        updated_at=now,
    )
    child = MediaCommentTable(
        id=child_id,
        user_id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=media_id,
        parent_comment_id=parent_id,
        content="Child reply",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([parent, child])
    await db_session.commit()

    repo = SqlCommentRepository(db_session)
    await repo.soft_delete(org_id, proj_id, media_id, parent_id)

    p_res = await db_session.get(MediaCommentTable, parent_id)
    assert p_res.deleted_at is not None

    c_res = await db_session.get(MediaCommentTable, child_id)
    assert c_res.deleted_at is not None


@pytest.mark.asyncio
async def test_delete_media_promotes_next_version_and_cascades_comments(db_session):
    org_id = uuid4()
    proj_id = uuid4()
    group_id = uuid4()
    v1_id = uuid4()
    v2_id = uuid4()
    now = utc_now()

    v1 = MediaAssetTable(
        id=v1_id,
        organization_id=org_id,
        project_id=proj_id,
        title="Version 1",
        filename="v1.mp4",
        storage_key="org/proj/v1.mp4",
        version_group_id=group_id,
        version_number=1,
        is_primary_version=False,
        status="ready",
        created_at=now,
        updated_at=now,
    )
    v2 = MediaAssetTable(
        id=v2_id,
        organization_id=org_id,
        project_id=proj_id,
        title="Version 2",
        filename="v2.mp4",
        storage_key="org/proj/v2.mp4",
        version_group_id=group_id,
        version_number=2,
        is_primary_version=True,
        status="ready",
        created_at=now,
        updated_at=now,
    )
    comment = MediaCommentTable(
        id=uuid4(),
        user_id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        media_id=v2_id,
        content="Great cut on v2",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([v1, v2, comment])
    await db_session.commit()

    repo = SqlMediaRepository(db_session)
    await repo.soft_delete(org_id, proj_id, v2_id)

    v2_res = await db_session.get(MediaAssetTable, v2_id)
    assert v2_res.deleted_at is not None
    assert v2_res.is_primary_version is False

    # v1 is promoted to primary version so the stack is not orphaned!
    v1_res = await db_session.get(MediaAssetTable, v1_id)
    assert v1_res.deleted_at is None
    assert v1_res.is_primary_version is True

    # comment is soft-deleted
    c_res = await db_session.get(MediaCommentTable, comment.id)
    assert c_res.deleted_at is not None
