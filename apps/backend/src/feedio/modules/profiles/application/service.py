import contextlib
from uuid import UUID

from feedio.modules.profiles.application.ports import AvatarStorage, ProfileRepository
from feedio.modules.profiles.domain.entities import ProfileRecord
from feedio.modules.profiles.domain.errors import (
    AvatarInvalidTypeError,
    AvatarTooLargeError,
    ProfileNotFoundError,
)
from feedio.modules.profiles.domain.value_objects import ProfileUpdate

MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class ProfileService:
    """Application service managing user profile operations and avatars."""

    def __init__(
        self,
        repository: ProfileRepository,
        avatar_storage: AvatarStorage,
    ) -> None:
        self._repository = repository
        self._avatar_storage = avatar_storage

    async def get_profile(self, user_id: UUID) -> ProfileRecord:
        record = await self._repository.get_by_user_id(user_id)
        if record is None:
            raise ProfileNotFoundError(f"Profile for user {user_id} not found")
        return record

    async def update_profile(
        self,
        user_id: UUID,
        update: ProfileUpdate,
    ) -> ProfileRecord:
        # Validate that the profile exists first
        await self.get_profile(user_id)
        return await self._repository.update_profile(
            user_id,
            display_name=update.display_name,
            job_title=update.job_title,
            timezone=update.timezone,
            locale=update.locale,
        )

    async def update_avatar(
        self,
        user_id: UUID,
        content: bytes,
        content_type: str,
        file_size: int,
    ) -> str:
        if file_size > MAX_AVATAR_SIZE_BYTES or len(content) > MAX_AVATAR_SIZE_BYTES:
            raise AvatarTooLargeError(
                f"Avatar file size ({file_size} bytes) exceeds limit of 5 MB"
            )

        clean_content_type = content_type.split(";")[0].strip().lower()
        ext = ALLOWED_MIME_TYPES.get(clean_content_type)
        if not ext:
            raise AvatarInvalidTypeError(
                f"Unsupported avatar type '{content_type}'. Allowed: JPEG, PNG, WebP, GIF"
            )

        key = f"avatars/{user_id}{ext}"
        public_url = await self._avatar_storage.put_avatar(
            key=key,
            data=content,
            content_type=clean_content_type,
        )
        await self._repository.update_avatar_url(user_id, public_url)
        return public_url

    async def delete_avatar(self, user_id: UUID) -> None:
        profile = await self.get_profile(user_id)
        if profile.avatar_url:
            for ext in ALLOWED_MIME_TYPES.values():
                possible_key = f"avatars/{user_id}{ext}"
                with contextlib.suppress(Exception):
                    await self._avatar_storage.delete_avatar(possible_key)
        await self._repository.update_avatar_url(user_id, None)
