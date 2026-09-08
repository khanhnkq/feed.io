from collections.abc import Callable
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.notifications.application.ports import NotificationService
from feedio.modules.notifications.domain.entities import Notification


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    organization_id: UUID
    actor_id: UUID | None = None
    type: str
    title: str
    message: str
    link_url: str
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    read_at: datetime | None = None
    is_read: bool
    created_at: datetime

    @classmethod
    def from_domain(cls, entity: Notification) -> "NotificationResponse":
        return cls(
            id=entity.id,
            user_id=entity.user_id,
            organization_id=entity.organization_id,
            actor_id=entity.actor_id,
            type=entity.type.value if hasattr(entity.type, "value") else str(entity.type),
            title=entity.title,
            message=entity.message,
            link_url=entity.link_url,
            metadata_json=entity.metadata_json or {},
            read_at=entity.read_at,
            is_read=entity.is_read,
            created_at=entity.created_at,
        )


class PaginatedNotificationsResponse(BaseModel):
    items: list[NotificationResponse]
    total_unread: int
    next_cursor: str | None = None


class UnreadCountResponse(BaseModel):
    unread_count: int


def create_notifications_router(
    notification_service_provider: Callable[..., NotificationService],
    current_user_provider: Callable[..., CurrentUser],
) -> APIRouter:
    router = APIRouter(
        prefix="/notifications",
        tags=["notifications"],
    )

    @router.get("", response_model=PaginatedNotificationsResponse)
    async def list_notifications(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        service: Annotated[NotificationService, Depends(notification_service_provider)],
        organization_id: UUID | None = Query(default=None),
        unread_only: bool = Query(default=False),
        limit: int = Query(default=30, ge=1, le=100),
        cursor: str | None = Query(default=None),
    ) -> PaginatedNotificationsResponse:
        items, total_unread, next_cursor = await service.list_notifications(
            user_id=current_user.id,
            organization_id=organization_id,
            unread_only=unread_only,
            limit=limit,
            cursor=cursor,
        )
        return PaginatedNotificationsResponse(
            items=[NotificationResponse.from_domain(item) for item in items],
            total_unread=total_unread,
            next_cursor=next_cursor,
        )

    @router.get("/unread-count", response_model=UnreadCountResponse)
    async def get_unread_count(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        service: Annotated[NotificationService, Depends(notification_service_provider)],
        organization_id: UUID | None = Query(default=None),
    ) -> UnreadCountResponse:
        count = await service.get_unread_count(
            user_id=current_user.id,
            organization_id=organization_id,
        )
        return UnreadCountResponse(unread_count=count)

    @router.patch(
        "/{notification_id}/read",
        response_model=NotificationResponse,
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def mark_as_read(
        notification_id: UUID,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        service: Annotated[NotificationService, Depends(notification_service_provider)],
    ) -> NotificationResponse:
        notification = await service.mark_read(
            notification_id=notification_id,
            user_id=current_user.id,
        )
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        return NotificationResponse.from_domain(notification)

    @router.post(
        "/mark-all-read",
        response_model=UnreadCountResponse,
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def mark_all_as_read(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        service: Annotated[NotificationService, Depends(notification_service_provider)],
        organization_id: UUID | None = Query(default=None),
    ) -> UnreadCountResponse:
        count = await service.mark_all_read(
            user_id=current_user.id,
            organization_id=organization_id,
        )
        return UnreadCountResponse(unread_count=count)

    return router
