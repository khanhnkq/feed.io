from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.profiles.application.service import ProfileService
from feedio.modules.profiles.domain.errors import (
    AvatarInvalidTypeError,
    AvatarTooLargeError,
    ProfileNotFoundError,
)
from feedio.modules.profiles.domain.value_objects import ProfileUpdate
from feedio.modules.profiles.presentation.schemas import (
    AvatarUploadResponse,
    ProfileResponse,
    UpdateProfileRequest,
)

ProfileServiceProvider = Callable[..., ProfileService | Awaitable[ProfileService]]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]


def create_profile_router(
    *,
    profile_service_provider: ProfileServiceProvider,
    current_user_provider: CurrentUserProvider,
) -> APIRouter:
    router = APIRouter(prefix="/profiles")

    @router.get(
        "/me",
        response_model=ProfileResponse,
        operation_id="get_my_profile",
        tags=["profiles"],
    )
    async def get_my_profile(
        service: Annotated[ProfileService, Depends(profile_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> ProfileResponse:
        try:
            profile = await service.get_profile(current_user.id)
            return ProfileResponse.from_domain(profile)
        except ProfileNotFoundError as err:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(err)) from err

    @router.patch(
        "/me",
        response_model=ProfileResponse,
        operation_id="update_my_profile",
        tags=["profiles"],
    )
    async def update_my_profile(
        body: UpdateProfileRequest,
        service: Annotated[ProfileService, Depends(profile_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> ProfileResponse:
        try:
            update = ProfileUpdate(
                display_name=body.display_name,
                job_title=body.job_title,
                timezone=body.timezone,
                locale=body.locale,
            )
            profile = await service.update_profile(current_user.id, update)
            return ProfileResponse.from_domain(profile)
        except ProfileNotFoundError as err:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(err)) from err

    @router.post(
        "/me/avatar",
        response_model=AvatarUploadResponse,
        operation_id="upload_my_avatar",
        tags=["profiles"],
    )
    async def upload_my_avatar(
        file: Annotated[UploadFile, File(description="Avatar image (JPEG, PNG, WebP, GIF ≤ 5MB)")],
        service: Annotated[ProfileService, Depends(profile_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> AvatarUploadResponse:
        content_type = file.content_type or "application/octet-stream"
        content = await file.read()
        size = len(content)

        try:
            await service.update_avatar(
                user_id=current_user.id,
                content=content,
                content_type=content_type,
                file_size=size,
            )
            profile = await service.get_profile(current_user.id)
            v = int(profile.updated_at.timestamp())
            url = f"/api/v1/profiles/{current_user.id}/avatar?v={v}"
            return AvatarUploadResponse(avatar_url=url)
        except AvatarTooLargeError as err:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, str(err)) from err
        except AvatarInvalidTypeError as err:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(err)) from err
        except ProfileNotFoundError as err:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(err)) from err

    @router.delete(
        "/me/avatar",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_my_avatar",
        tags=["profiles"],
    )
    async def delete_my_avatar(
        service: Annotated[ProfileService, Depends(profile_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> None:
        try:
            await service.delete_avatar(current_user.id)
        except ProfileNotFoundError as err:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(err)) from err

    @router.get(
        "/{user_id}/avatar",
        operation_id="get_user_avatar",
        tags=["profiles"],
    )
    async def get_user_avatar(
        user_id: UUID,
        service: Annotated[ProfileService, Depends(profile_service_provider)],
        v: str | None = None,
    ) -> Response:
        avatar = await service.get_avatar_bytes(user_id)
        if not avatar:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Avatar not found")
        data, content_type = avatar
        cache_control = (
            "public, max-age=31536000, immutable"
            if v
            else "public, max-age=0, must-revalidate, no-cache"
        )
        return Response(
            content=data,
            media_type=content_type,
            headers={"Cache-Control": cache_control},
        )

    return router
