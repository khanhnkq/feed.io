from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4


@dataclass(frozen=True)
class RealtimeEvent:
    event_type: str
    room: str
    payload: dict[str, Any]
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "event_type": self.event_type,
            "room": self.room,
            "payload": self.payload,
            "created_at": self.created_at.isoformat(),
        }


@dataclass(frozen=True)
class PresenceUser:
    user_id: UUID
    name: str
    email: str | None = None
    avatar_url: str | None = None
    joined_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "name": self.name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "joined_at": self.joined_at.isoformat(),
        }
