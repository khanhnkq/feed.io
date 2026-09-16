from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.comments.application.ports import CommentRepository
from feedio.modules.comments.presentation.schemas import (
    CommentAuthorResponse,
    IssuesSummaryResponse,
    ListProjectIssuesResponse,
    ProjectIssueResponse,
)
from feedio.modules.media.application.ports import StorageService
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


def create_project_issues_router(
    comment_repository_provider: Callable[..., CommentRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    organization_context_provider: Callable[..., OrganizationContext],
    storage_service_provider: Callable[[], StorageService] | None = None,
) -> APIRouter:
    router = APIRouter(
        prefix="/organizations/{organization_id}/projects/{project_id}/issues",
        tags=["project_issues"],
    )

    async def _verify_project_access(
        context: OrganizationContext,
        project_repository: ProjectRepository,
        project_id: UUID,
    ) -> None:
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await GetProject(project_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Access denied to project"
            ) from e

    @router.get(
        "",
        response_model=ListProjectIssuesResponse,
        operation_id="list_project_issues",
    )
    async def list_issues(
        project_id: UUID,
        context: Annotated[
            OrganizationContext, Depends(organization_context_provider)
        ],
        comment_repository: Annotated[
            CommentRepository, Depends(comment_repository_provider)
        ],
        project_repository: Annotated[
            ProjectRepository, Depends(project_repository_provider)
        ],
        storage_service: Annotated[
            StorageService | None,
            Depends(storage_service_provider or (lambda: None)),
        ] = None,
        status_filter: str | None = Query(
            default=None, alias="status", pattern="^(open|resolved)$"
        ),
        media_id: UUID | None = None,
        search: str | None = None,
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
    ) -> ListProjectIssuesResponse:
        await _verify_project_access(context, project_repository, project_id)
        issues, total = await comment_repository.list_by_project(
            organization_id=context.organization_id,
            project_id=project_id,
            status=status_filter,
            media_id=media_id,
            search=search,
            limit=limit,
            offset=offset,
        )

        items: list[ProjectIssueResponse] = []
        for issue in issues:
            thumbnail_url: str | None = None
            if storage_service:
                target_key = issue.media_thumbnail_storage_key or (
                    issue.media_storage_key
                    if issue.media_mime_type.lower().startswith("image/")
                    else None
                )
                if target_key:
                    thumbnail_url = await storage_service.generate_presigned_view_url(
                        storage_key=target_key,
                        expires_in=7200,
                    )

            author = (
                CommentAuthorResponse(
                    id=issue.user_id,
                    name=issue.author_name,
                    email=issue.author_email,
                    avatar_url=issue.author_avatar_url,
                )
                if issue.author_name or issue.author_email
                else None
            )

            items.append(
                ProjectIssueResponse(
                    id=issue.id,
                    organization_id=issue.organization_id,
                    project_id=issue.project_id,
                    media_id=issue.media_id,
                    media_title=issue.media_title,
                    media_type=issue.media_type,
                    media_thumbnail_url=thumbnail_url,
                    media_version_number=issue.media_version_number,
                    user_id=issue.user_id,
                    parent_comment_id=issue.parent_comment_id,
                    timestamp_seconds=issue.timestamp_seconds,
                    frame_number=issue.frame_number,
                    content=issue.content,
                    annotation_data=issue.annotation_data,
                    status=issue.status,
                    created_at=issue.created_at,
                    updated_at=issue.updated_at,
                    author=author,
                    replies_count=issue.replies_count,
                )
            )

        return ListProjectIssuesResponse(items=items, total=total)

    @router.get(
        "/summary",
        response_model=IssuesSummaryResponse,
        operation_id="get_project_issues_summary",
    )
    async def get_summary(
        project_id: UUID,
        context: Annotated[
            OrganizationContext, Depends(organization_context_provider)
        ],
        comment_repository: Annotated[
            CommentRepository, Depends(comment_repository_provider)
        ],
        project_repository: Annotated[
            ProjectRepository, Depends(project_repository_provider)
        ],
        media_id: UUID | None = None,
    ) -> IssuesSummaryResponse:
        await _verify_project_access(context, project_repository, project_id)
        summary = await comment_repository.get_issues_summary(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        return IssuesSummaryResponse(
            total=summary.total,
            open=summary.open,
            resolved=summary.resolved,
        )

    return router
