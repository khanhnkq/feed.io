from typing import Any
from uuid import UUID

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.notifications.application.ports import (
    NotificationRepository,
    NotificationService,
)
from feedio.modules.notifications.domain.entities import Notification
from feedio.modules.notifications.domain.enums import NotificationType


class NotificationServiceImpl(NotificationService):
    def __init__(
        self,
        repository: NotificationRepository,
        event_publisher: RealtimeEventPublisher | None = None,
    ) -> None:
        self._repository = repository
        self._event_publisher = event_publisher

    async def create_notification(
        self,
        user_id: UUID,
        organization_id: UUID,
        type: NotificationType,
        title: str,
        message: str,
        link_url: str,
        actor_id: UUID | None = None,
        metadata_json: dict[str, Any] | None = None,
    ) -> Notification:
        notification = Notification.create(
            user_id=user_id,
            organization_id=organization_id,
            actor_id=actor_id,
            type=type,
            title=title,
            message=message,
            link_url=link_url,
            metadata_json=metadata_json,
        )
        saved = await self._repository.save(notification)

        # Broadcast realtime event to user notification room
        if self._event_publisher:
            try:
                unread_count = await self._repository.count_unread(user_id)
                event = RealtimeEvent(
                    event_type="notification.created",
                    room=f"user:{user_id}",
                    payload={
                        "notification": {
                            "id": str(saved.id),
                            "type": saved.type.value if hasattr(saved.type, "value") else str(saved.type),
                            "title": saved.title,
                            "message": saved.message,
                            "link_url": saved.link_url,
                            "actor_id": str(saved.actor_id) if saved.actor_id else None,
                            "metadata_json": saved.metadata_json,
                            "created_at": saved.created_at.isoformat(),
                            "is_read": False,
                        },
                        "unread_count": unread_count,
                    },
                )
                await self._event_publisher.publish(event)
            except Exception:
                pass

        return saved

    async def list_notifications(
        self,
        user_id: UUID,
        organization_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Notification], int, str | None]:
        items, next_cursor = await self._repository.list_for_user(
            user_id=user_id,
            organization_id=organization_id,
            unread_only=unread_only,
            limit=limit,
            cursor=cursor,
        )
        unread_count = await self._repository.count_unread(
            user_id=user_id,
            organization_id=organization_id,
        )
        return items, unread_count, next_cursor

    async def get_unread_count(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        return await self._repository.count_unread(
            user_id=user_id,
            organization_id=organization_id,
        )

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        return await self._repository.mark_as_read(notification_id, user_id)

    async def mark_all_read(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        return await self._repository.mark_all_as_read(user_id, organization_id)
