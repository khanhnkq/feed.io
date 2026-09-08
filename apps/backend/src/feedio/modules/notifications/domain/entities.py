from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from feedio.modules.notifications.domain.enums import NotificationType


@dataclass
class Notification:
    id: UUID
    user_id: UUID
    organization_id: UUID
    type: NotificationType
    title: str
    message: str
    link_url: str
    actor_id: UUID | None = None
    metadata_json: dict[str, Any] = field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    @classmethod
    def create(
        cls,
        user_id: UUID,
        organization_id: UUID,
        type: NotificationType,
        title: str,
        message: str,
        link_url: str,
        actor_id: UUID | None = None,
        metadata_json: dict[str, Any] | None = None,
    ) -> "Notification":
        return cls(
            id=uuid4(),
            user_id=user_id,
            organization_id=organization_id,
            actor_id=actor_id,
            type=type,
            title=title,
            message=message,
            link_url=link_url,
            metadata_json=metadata_json or {},
            created_at=datetime.now(UTC),
        )
