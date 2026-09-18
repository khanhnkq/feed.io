from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

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
            avatar_url = await service.update_avatar(
                user_id=current_user.id,
                content=content,
                content_type=content_type,
                file_size=size,
            )
            return AvatarUploadResponse(avatar_url=avatar_url)
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

    return router
