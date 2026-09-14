from uuid import uuid4

import pytest

from feedio.modules.media.application.commands.set_primary_version import (
    SetPrimaryVersion,
)
from feedio.modules.media.application.commands.stack_media import StackMedia
from feedio.modules.media.application.commands.unstack_media import UnstackMedia
from feedio.modules.media.application.commands.update_version_label import (
    UpdateVersionLabel,
)
from feedio.modules.media.application.queries.list_media import ListMedia
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import (
    InvalidVersionOperationError,
    MediaNotFoundError,
)
from feedio.shared.infrastructure.persistence import utc_now
from tests.media_fakes import InMemoryMediaRepository


def _make_asset(
    org_id: uuid4,
    proj_id: uuid4,
    title: str,
    version_group_id=None,
    version_number: int = 1,
    is_primary: bool = True,
    version_label: str | None = None,
) -> MediaAsset:
    now = utc_now()
    return MediaAsset(
        id=uuid4(),
        organization_id=org_id,
        project_id=proj_id,
        folder_id=None,
        created_by_user_id=uuid4(),
        title=title,
        filename=f"{title}.mp4",
        file_size_bytes=10_000_000,
        mime_type="video/mp4",
        storage_key=f"media/{title}.mp4",
        status="ready",
        version_group_id=version_group_id,
        version_number=version_number,
        is_primary_version=is_primary,
        version_label=version_label,
        version_count=1,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_stack_two_single_media() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    media_v1 = await repo.create(_make_asset(org_id, proj_id, "Video_v1"))
    media_v2 = await repo.create(_make_asset(org_id, proj_id, "Video_v2"))

    stack_cmd = StackMedia(repo)
    target, source = await stack_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        target_media_id=media_v1.id,
        source_media_id=media_v2.id,
        version_label="Color Grade v2",
    )

    assert target.version_group_id is not None
    assert source.version_group_id == target.version_group_id
    assert target.version_number == 1
    assert not target.is_primary_version
    assert source.version_number == 2
    assert source.is_primary_version
    assert source.version_label == "Color Grade v2"
    assert target.version_count == 2
    assert source.version_count == 2


@pytest.mark.asyncio
async def test_stack_rejects_self_or_same_group() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    media = await repo.create(_make_asset(org_id, proj_id, "Solo_Video"))
    stack_cmd = StackMedia(repo)

    with pytest.raises(InvalidVersionOperationError, match="with itself"):
        await stack_cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            target_media_id=media.id,
            source_media_id=media.id,
        )

    m1 = await repo.create(_make_asset(org_id, proj_id, "Clip_1"))
    m2 = await repo.create(_make_asset(org_id, proj_id, "Clip_2"))
    await stack_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        target_media_id=m1.id,
        source_media_id=m2.id,
    )

    with pytest.raises(InvalidVersionOperationError, match="already in the same version stack"):
        await stack_cmd.execute(
            organization_id=org_id,
            project_id=proj_id,
            target_media_id=m1.id,
            source_media_id=m2.id,
        )


@pytest.mark.asyncio
async def test_set_primary_version() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    v1 = await repo.create(_make_asset(org_id, proj_id, "Cut_v1"))
    v2 = await repo.create(_make_asset(org_id, proj_id, "Cut_v2"))
    await StackMedia(repo).execute(org_id, proj_id, v1.id, v2.id)

    # v2 is currently primary. Let's switch primary to v1
    set_primary = SetPrimaryVersion(repo)
    updated_v1 = await set_primary.execute(org_id, proj_id, v1.id)

    assert updated_v1.is_primary_version
    refreshed_v2 = await repo.get_by_id(org_id, proj_id, v2.id)
    assert not refreshed_v2.is_primary_version


@pytest.mark.asyncio
async def test_update_version_label() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    media = await repo.create(_make_asset(org_id, proj_id, "Trailer"))
    cmd = UpdateVersionLabel(repo)
    updated = await cmd.execute(org_id, proj_id, media.id, "Director's Cut")

    assert updated.version_label == "Director's Cut"


@pytest.mark.asyncio
async def test_unstack_media_reassigns_primary() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    v1 = await repo.create(_make_asset(org_id, proj_id, "Ep1_v1"))
    v2 = await repo.create(_make_asset(org_id, proj_id, "Ep1_v2"))
    v3 = await repo.create(_make_asset(org_id, proj_id, "Ep1_v3"))

    await StackMedia(repo).execute(org_id, proj_id, v1.id, v2.id)
    await StackMedia(repo).execute(org_id, proj_id, v1.id, v3.id)

    # v3 is primary. Unstack v3
    unstack_cmd = UnstackMedia(repo)
    unstacked = await unstack_cmd.execute(org_id, proj_id, v3.id)

    assert unstacked.version_group_id is None
    assert unstacked.version_number == 1
    assert unstacked.is_primary_version

    # v2 was the next highest version, so it should now be primary
    refreshed_v2 = await repo.get_by_id(org_id, proj_id, v2.id)
    assert refreshed_v2.is_primary_version

    refreshed_v1 = await repo.get_by_id(org_id, proj_id, v1.id)
    assert not refreshed_v1.is_primary_version


@pytest.mark.asyncio
async def test_list_media_group_versions() -> None:
    repo = InMemoryMediaRepository()
    org_id = uuid4()
    proj_id = uuid4()

    v1 = await repo.create(_make_asset(org_id, proj_id, "Feature_v1"))
    v2 = await repo.create(_make_asset(org_id, proj_id, "Feature_v2"))
    solo = await repo.create(_make_asset(org_id, proj_id, "Solo_Asset"))

    await StackMedia(repo).execute(org_id, proj_id, v1.id, v2.id)

    list_cmd = ListMedia(repo)

    # Group versions = True (default): should return v2 (primary of stack) and solo
    grouped_page = await list_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        group_versions=True,
    )
    assert len(grouped_page.items) == 2
    grouped_ids = {m.id for m in grouped_page.items}
    assert v2.id in grouped_ids
    assert solo.id in grouped_ids
    assert v1.id not in grouped_ids

    # Group versions = False (Show All): should return v1, v2, and solo
    all_page = await list_cmd.execute(
        organization_id=org_id,
        project_id=proj_id,
        group_versions=False,
    )
    assert len(all_page.items) == 3
