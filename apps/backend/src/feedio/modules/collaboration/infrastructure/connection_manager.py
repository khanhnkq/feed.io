import asyncio
import contextlib
import json
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from redis.asyncio import Redis
from starlette.websockets import WebSocketState

from feedio.modules.collaboration.application.ports import ConnectionManager

NIL_UUID = UUID("00000000-0000-0000-0000-000000000000")


class ValkeyConnectionManager(ConnectionManager):
    def __init__(self, valkey_url: str, redis_client: Redis[Any] | None = None) -> None:
        self._valkey_url = valkey_url
        self._redis = redis_client
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._socket_user_map: dict[WebSocket, UUID] = {}
        self._pubsub_task: asyncio.Task[None] | None = None
        self._running = False

    async def connect(self, room: str, user_id: UUID, websocket: WebSocket) -> None:
        if websocket.client_state != WebSocketState.CONNECTED:
            await websocket.accept()
        self._rooms[room].add(websocket)
        self._socket_user_map[websocket] = user_id

    async def disconnect(self, room: str, user_id: UUID, websocket: WebSocket) -> None:
        if room in self._rooms and websocket in self._rooms[room]:
            self._rooms[room].remove(websocket)
            if not self._rooms[room]:
                del self._rooms[room]
        if not any(websocket in sockets for sockets in self._rooms.values()):
            self._socket_user_map.pop(websocket, None)

    async def broadcast_to_room(self, room: str, event_dict: dict[str, Any]) -> None:
        target_sockets = list(self._rooms.get(room, set()))
        if not target_sockets:
            return

        payload_json = json.dumps(event_dict)
        dead_sockets: list[WebSocket] = []

        for socket in target_sockets:
            try:
                await socket.send_text(payload_json)
            except (WebSocketDisconnect, RuntimeError, Exception):
                dead_sockets.append(socket)

        for dead_socket in dead_sockets:
            user_id = self._socket_user_map.get(dead_socket, NIL_UUID)
            await self.disconnect(room, user_id, dead_socket)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._pubsub_task = asyncio.create_task(self._listen_pubsub())

    async def stop(self) -> None:
        self._running = False
        if self._pubsub_task and not self._pubsub_task.done():
            self._pubsub_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._pubsub_task
        if self._redis:
            if hasattr(self._redis, "aclose"):
                await self._redis.aclose()
            else:
                await self._redis.close()

    async def _listen_pubsub(self) -> None:
        client = self._redis or Redis.from_url(self._valkey_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.psubscribe("feedio:room:*")

        try:
            async for message in pubsub.listen():
                if not self._running:
                    break
                if message and message.get("type") in ("pmessage", "message"):
                    channel: str = message.get("channel", "")
                    # Channel format: feedio:room:<room_name>
                    room = channel.replace("feedio:room:", "", 1)
                    data_str = message.get("data", "{}")
                    try:
                        event_data = json.loads(data_str)
                        await self.broadcast_to_room(room, event_data)
                    except (json.JSONDecodeError, TypeError):
                        continue
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
        finally:
            with contextlib.suppress(Exception):
                await pubsub.punsubscribe("feedio:room:*")
                if hasattr(pubsub, "aclose"):
                    await pubsub.aclose()
                else:
                    await pubsub.close()
