from typing import Protocol
from uuid import UUID

from feedio.modules.collaboration.domain.entities import PresenceUser, RealtimeEvent


class RealtimeEventPublisher(Protocol):
    async def publish(self, event: RealtimeEvent) -> None: ...


class PresenceService(Protocol):
    async def join_room(self, room: str, user: PresenceUser) -> list[PresenceUser]: ...

    async def leave_room(self, room: str, user_id: UUID) -> list[PresenceUser]: ...

    async def list_presence(self, room: str) -> list[PresenceUser]: ...


class ConnectionManager(Protocol):
    async def connect(self, room: str, user_id: UUID, websocket: object) -> None: ...

    async def disconnect(self, room: str, user_id: UUID, websocket: object) -> None: ...

    async def broadcast_to_room(self, room: str, event_dict: dict[str, object]) -> None: ...
