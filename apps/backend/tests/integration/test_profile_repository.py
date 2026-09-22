import os
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.profiles.infrastructure.repository import SqlProfileRepository

DATABASE_URL = os.getenv("FEEDIO_INTEGRATION_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not DATABASE_URL, reason="integration database is not configured"),
]


@pytest.mark.asyncio
async def test_sql_profile_repository_lifecycle() -> None:
    assert DATABASE_URL is not None
    engine = create_async_engine(DATABASE_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    test_user_id = uuid4()
    test_email = f"profile-test-{test_user_id}@feedio.test"

    async with sessions() as session:
        user = UserTable(
            id=test_user_id,
            email=test_email,
            password_hash="test-pass",
            status="active",
        )
        session.add(user)
        await session.commit()

        repo = SqlProfileRepository(session)

        # 1. First get auto-creates profile from UserTable
        profile = await repo.get_by_user_id(test_user_id)
        assert profile is not None
        assert profile.user_id == test_user_id
        assert profile.display_name == test_email.split("@")[0]

        # 2. Update profile fields
        updated = await repo.update_profile(
            test_user_id,
            display_name="Updated Name",
            job_title="Engineer",
            timezone="Asia/Ho_Chi_Minh",
            locale="vi",
        )
        assert updated.display_name == "Updated Name"
        assert updated.job_title == "Engineer"
        assert updated.timezone == "Asia/Ho_Chi_Minh"
        assert updated.locale == "vi"

        # 3. Update avatar url
        await repo.update_avatar_url(test_user_id, "https://storage.feedio.test/avatar.png")
        profile_after_avatar = await repo.get_by_user_id(test_user_id)
        assert profile_after_avatar is not None
        assert profile_after_avatar.avatar_url == "https://storage.feedio.test/avatar.png"

        # 4. Clean up avatar url
        await repo.update_avatar_url(test_user_id, None)
        profile_cleared = await repo.get_by_user_id(test_user_id)
        assert profile_cleared is not None
        assert profile_cleared.avatar_url is None

    await engine.dispose()
