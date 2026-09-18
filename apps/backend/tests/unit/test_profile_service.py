from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from feedio.modules.profiles.application.ports import AvatarStorage, ProfileRepository
from feedio.modules.profiles.application.service import (
    MAX_AVATAR_SIZE_BYTES,
    ProfileService,
)
from feedio.modules.profiles.domain.entities import ProfileRecord
from feedio.modules.profiles.domain.errors import (
    AvatarInvalidTypeError,
    AvatarTooLargeError,
    ProfileNotFoundError,
)
from feedio.modules.profiles.domain.value_objects import ProfileUpdate


class FakeProfileRepository(ProfileRepository):
    def __init__(self) -> None:
        self.profiles: dict[UUID, ProfileRecord] = {}

    async def get_by_user_id(self, user_id: UUID) -> ProfileRecord | None:
        return self.profiles.get(user_id)

    async def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        job_title: str | None,
        timezone: str | None,
        locale: str | None,
    ) -> ProfileRecord:
        current = self.profiles[user_id]
        updated = ProfileRecord(
            id=current.id,
            user_id=current.user_id,
            display_name=display_name if display_name is not None else current.display_name,
            avatar_url=current.avatar_url,
            job_title=job_title if job_title is not None else current.job_title,
            timezone=timezone if timezone is not None else current.timezone,
            locale=locale if locale is not None else current.locale,
            created_at=current.created_at,
            updated_at=datetime.now(UTC),
        )
        self.profiles[user_id] = updated
        return updated

    async def update_avatar_url(self, user_id: UUID, url: str | None) -> None:
        current = self.profiles[user_id]
        self.profiles[user_id] = ProfileRecord(
            id=current.id,
            user_id=current.user_id,
            display_name=current.display_name,
            avatar_url=url,
            job_title=current.job_title,
            timezone=current.timezone,
            locale=current.locale,
            created_at=current.created_at,
            updated_at=datetime.now(UTC),
        )


class FakeAvatarStorage(AvatarStorage):
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    async def put_avatar(self, key: str, data: bytes, content_type: str) -> str:
        self.objects[key] = data
        return f"https://cdn.feed.io/{key}"

    async def delete_avatar(self, key: str) -> None:
        self.objects.pop(key, None)


@pytest.fixture
def test_user_id() -> UUID:
    return uuid4()


@pytest.fixture
def repo(test_user_id: UUID) -> FakeProfileRepository:
    r = FakeProfileRepository()
    r.profiles[test_user_id] = ProfileRecord(
        id=uuid4(),
        user_id=test_user_id,
        display_name="Khanh Nguyen",
        avatar_url=None,
        job_title="Lead Dev",
        timezone="Asia/Ho_Chi_Minh",
        locale="vi",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    return r


@pytest.fixture
def storage() -> FakeAvatarStorage:
    return FakeAvatarStorage()


@pytest.fixture
def service(repo: FakeProfileRepository, storage: FakeAvatarStorage) -> ProfileService:
    return ProfileService(repository=repo, avatar_storage=storage)


async def test_get_profile_success(service: ProfileService, test_user_id: UUID) -> None:
    profile = await service.get_profile(test_user_id)
    assert profile.display_name == "Khanh Nguyen"
    assert profile.job_title == "Lead Dev"
    assert profile.locale == "vi"


async def test_get_profile_not_found(service: ProfileService) -> None:
    with pytest.raises(ProfileNotFoundError):
        await service.get_profile(uuid4())


async def test_update_profile_success(service: ProfileService, test_user_id: UUID) -> None:
    updated = await service.update_profile(
        test_user_id,
        ProfileUpdate(
            display_name="Khanh Pro",
            job_title="Principal Engineer",
            timezone="UTC",
        ),
    )
    assert updated.display_name == "Khanh Pro"
    assert updated.job_title == "Principal Engineer"
    assert updated.timezone == "UTC"


async def test_upload_avatar_success(
    service: ProfileService,
    storage: FakeAvatarStorage,
    repo: FakeProfileRepository,
    test_user_id: UUID,
) -> None:
    avatar_bytes = b"\x89PNG\r\n\x1a\nfakeimagecontent"
    url = await service.update_avatar(
        user_id=test_user_id,
        content=avatar_bytes,
        content_type="image/png",
        file_size=len(avatar_bytes),
    )
    assert url == f"https://cdn.feed.io/avatars/{test_user_id}.png"
    assert storage.objects[f"avatars/{test_user_id}.png"] == avatar_bytes
    profile = await service.get_profile(test_user_id)
    assert profile.avatar_url == url


async def test_upload_avatar_too_large(service: ProfileService, test_user_id: UUID) -> None:
    large_bytes = b"0" * (MAX_AVATAR_SIZE_BYTES + 1)
    with pytest.raises(AvatarTooLargeError):
        await service.update_avatar(
            user_id=test_user_id,
            content=large_bytes,
            content_type="image/jpeg",
            file_size=len(large_bytes),
        )


async def test_upload_avatar_invalid_type(service: ProfileService, test_user_id: UUID) -> None:
    with pytest.raises(AvatarInvalidTypeError):
        await service.update_avatar(
            user_id=test_user_id,
            content=b"executable",
            content_type="application/x-msdownload",
            file_size=10,
        )


async def test_delete_avatar(
    service: ProfileService,
    storage: FakeAvatarStorage,
    repo: FakeProfileRepository,
    test_user_id: UUID,
) -> None:
    avatar_bytes = b"\xff\xd8\xff\xe0fakejpeg"
    await service.update_avatar(
        user_id=test_user_id,
        content=avatar_bytes,
        content_type="image/jpeg",
        file_size=len(avatar_bytes),
    )
    await service.delete_avatar(test_user_id)
    profile = await service.get_profile(test_user_id)
    assert profile.avatar_url is None
