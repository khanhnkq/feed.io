from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from feedio.modules.notifications.domain.entities import Notification
from feedio.modules.notifications.domain.enums import NotificationType


class NotificationRepository(ABC):
    @abstractmethod
    async def save(self, notification: Notification) -> Notification:
        """Persist a notification."""
        ...

    @abstractmethod
    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        """Get notification by ID."""
        ...

    @abstractmethod
    async def list_for_user(
        self,
        user_id: UUID,
        organization_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Notification], str | None]:
        """List notifications for a user with keyset pagination."""
        ...

    @abstractmethod
    async def count_unread(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        """Count unread notifications for a user."""
        ...

    @abstractmethod
    async def mark_as_read(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        """Mark single notification as read."""
        ...

    @abstractmethod
    async def mark_all_as_read(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        """Mark all notifications as read for a user, returning count updated."""
        ...


class NotificationService(ABC):
    @abstractmethod
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
        """Create and dispatch a notification."""
        ...

    @abstractmethod
    async def list_notifications(
        self,
        user_id: UUID,
        organization_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Notification], int, str | None]:
        """List notifications, returning (items, total_unread, next_cursor)."""
        ...

    @abstractmethod
    async def get_unread_count(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        """Get count of unread notifications."""
        ...

    @abstractmethod
    async def mark_read(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        """Mark a notification as read."""
        ...

    @abstractmethod
    async def mark_all_read(self, user_id: UUID, organization_id: UUID | None = None) -> int:
        """Mark all notifications as read."""
        ...
