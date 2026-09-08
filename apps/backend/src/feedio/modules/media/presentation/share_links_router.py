from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.commands.create_share_link import CreateShareLink
from feedio.modules.media.application.commands.revoke_share_link import RevokeShareLink
from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.application.queries.list_share_links import ListShareLinks
from feedio.modules.media.domain.errors import (
    MediaNotFoundError,
    ShareLinkNotFoundError,
)
from feedio.modules.media.presentation.schemas import (
    CreateShareLinkRequest,
    CreateShareLinkResponse,
    ShareLinkResponse,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import (
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)


def create_share_links_router(
    media_repository_provider: Callable[..., MediaRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    organization_context_provider: Callable[..., OrganizationContext],
) -> APIRouter:
    router = APIRouter(tags=["media-share-links"])

    async def _verify_project_access(
        context: OrganizationContext,
        project_repo: ProjectRepository,
        project_id: UUID,
    ) -> None:
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await GetProject(project_repo).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to project") from e

    @router.post(
        "/{media_id}/share-links",
        response_model=CreateShareLinkResponse,
        status_code=status.HTTP_201_CREATED,
        operation_id="create_share_link",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def create_share_link(
        project_id: UUID,
        media_id: UUID,
        payload: CreateShareLinkRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> CreateShareLinkResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            share_link, raw_token = await CreateShareLink(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                created_by_user_id=context.user_id,
                passphrase=payload.passphrase,
                expires_in_days=payload.expires_in_days,
                allow_comments=payload.allow_comments,
                allow_approval=payload.allow_approval,
                allow_download=payload.allow_download,
            )
            return CreateShareLinkResponse(
                id=share_link.id,
                share_url=f"/share/{raw_token}",
                raw_token=raw_token,
                allow_comments=share_link.allow_comments,
                allow_approval=share_link.allow_approval,
                allow_download=share_link.allow_download,
                has_passphrase=share_link.passphrase_hash is not None,
                expires_at=share_link.expires_at,
                created_at=share_link.created_at,
            )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.get(
        "/{media_id}/share-links",
        response_model=list[ShareLinkResponse],
        operation_id="list_share_links",
    )
    async def list_share_links(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> list[ShareLinkResponse]:
        await _verify_project_access(context, project_repository, project_id)
        links = await ListShareLinks(media_repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        return [
            ShareLinkResponse(
                id=link.id,
                organization_id=link.organization_id,
                project_id=link.project_id,
                media_id=link.media_id,
                folder_id=link.folder_id,
                created_by_user_id=link.created_by_user_id,
                allow_comments=link.allow_comments,
                allow_approval=link.allow_approval,
                allow_download=link.allow_download,
                has_passphrase=link.passphrase_hash is not None,
                expires_at=link.expires_at,
                access_count=link.access_count,
                is_revoked=link.is_revoked,
                created_at=link.created_at,
            )
            for link in links
        ]

    @router.delete(
        "/{media_id}/share-links/{share_link_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="revoke_share_link",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def revoke_share_link(
        project_id: UUID,
        media_id: UUID,
        share_link_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> None:
        await _verify_project_access(context, project_repository, project_id)
        try:
            await RevokeShareLink(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                share_link_id=share_link_id,
            )
        except ShareLinkNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    return router
