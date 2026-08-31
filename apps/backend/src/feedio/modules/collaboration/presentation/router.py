import json
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel

from feedio.bootstrap.database import session_factory
from feedio.modules.collaboration.application.ports import (
    ConnectionManager,
    PresenceService,
    RealtimeEventPublisher,
)
from feedio.modules.collaboration.domain.entities import PresenceUser, RealtimeEvent
from feedio.modules.identity.application.ports import AuthRepository, TokenManager


class PresenceUserResponse(BaseModel):
    user_id: UUID
    name: str
    email: str | None = None
    avatar_url: str | None = None
    joined_at: str


class RoomPresenceResponse(BaseModel):
    room: str
    users: list[PresenceUserResponse]


def create_collaboration_router(
    connection_manager: ConnectionManager,
    event_publisher: RealtimeEventPublisher,
    presence_service: PresenceService,
    token_manager: TokenManager,
    auth_repo_provider: Annotated[AuthRepository, Depends],
) -> APIRouter:
    router = APIRouter(tags=["collaboration"])

    @router.get("/rooms/{room}/presence", response_model=RoomPresenceResponse)
    async def get_room_presence(room: str) -> RoomPresenceResponse:
        users = await presence_service.list_presence(room)
        return RoomPresenceResponse(
            room=room,
            users=[
                PresenceUserResponse(
                    user_id=u.user_id,
                    name=u.name,
                    email=u.email,
                    avatar_url=u.avatar_url,
                    joined_at=u.joined_at.isoformat(),
                )
                for u in users
            ],
        )

    @router.websocket("/events/ws")
    async def websocket_events_endpoint(
        websocket: WebSocket,
        token: Annotated[str | None, Query()] = None,
        media_id: Annotated[UUID | None, Query()] = None,
        room: Annotated[str | None, Query()] = None,
        feedio_access_token: Annotated[str | None, Cookie()] = None,
    ) -> None:
        effective_token = token or feedio_access_token
        user_id = None
        user_name = "Collaborator"
        user_email = None
        user_avatar = None

        if effective_token:
            try:
                claims = token_manager.verify_access(effective_token)
                user_id = claims.user_id
            except Exception:
                user_id = None

        if not user_id:
            from uuid import uuid4
            user_id = uuid4()
            user_name = f"Guest {str(user_id)[:4]}"
        else:
            try:
                async with session_factory() as db_session:
                    auth_repo = await auth_repo_provider(db_session)
                    user_record = await auth_repo.find_user_by_id(user_id)
                    if user_record:
                        user_name = user_record.display_name or "Collaborator"
                        user_email = user_record.email
                        user_avatar = user_record.avatar_url
            except Exception:
                pass

        target_room = f"media:{media_id}" if media_id else (room or "global")
        presence_user = PresenceUser(
            user_id=user_id,
            name=user_name,
            email=user_email,
            avatar_url=user_avatar,
        )

        await connection_manager.connect(target_room, user_id, websocket)
        current_users = await presence_service.join_room(target_room, presence_user)

        # Broadcast join event to everyone in the room
        await event_publisher.publish(
            RealtimeEvent(
                event_type="presence.joined",
                room=target_room,
                payload={"user": presence_user.to_dict()},
            )
        )

        # Send initial sync to connecting client
        await websocket.send_text(
            json.dumps(
                {
                    "event_type": "presence.sync",
                    "room": target_room,
                    "payload": {"users": [u.to_dict() for u in current_users]},
                }
            )
        )

        try:
            while True:
                message_text = await websocket.receive_text()
                try:
                    msg_json = json.loads(message_text)
                    msg_type = msg_json.get("type") or msg_json.get("event_type")
                    if msg_type == "ping":
                        await websocket.send_text(json.dumps({"event_type": "pong"}))
                except (json.JSONDecodeError, TypeError):
                    continue
        except WebSocketDisconnect:
            pass
        finally:
            await connection_manager.disconnect(target_room, user_id, websocket)
            await presence_service.leave_room(target_room, user_id)
            await event_publisher.publish(
                RealtimeEvent(
                    event_type="presence.left",
                    room=target_room,
                    payload={"user_id": str(user_id)},
                )
            )

    return router
