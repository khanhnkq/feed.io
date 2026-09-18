from typing import Protocol
from uuid import UUID

from feedio.modules.profiles.domain.entities import ProfileRecord


class ProfileRepository(Protocol):
    async def get_by_user_id(self, user_id: UUID) -> ProfileRecord | None: ...

    async def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        job_title: str | None,
        timezone: str | None,
        locale: str | None,
    ) -> ProfileRecord: ...

    async def update_avatar_url(self, user_id: UUID, url: str | None) -> None: ...


class AvatarStorage(Protocol):
    async def put_avatar(self, key: str, data: bytes, content_type: str) -> str: ...

    async def delete_avatar(self, key: str) -> None: ...
