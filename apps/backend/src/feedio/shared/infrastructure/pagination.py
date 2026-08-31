import base64
import json
from datetime import datetime
from uuid import UUID


def encode_cursor(created_at: datetime, id_: UUID) -> str:
    payload = {"t": created_at.isoformat(), "id": str(id_)}
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_cursor(cursor_str: str) -> tuple[datetime, UUID] | None:
    try:
        raw = base64.urlsafe_b64decode(cursor_str.encode("ascii"))
        payload = json.loads(raw.decode("utf-8"))
        created_at = datetime.fromisoformat(payload["t"])
        id_ = UUID(payload["id"])
        return created_at, id_
    except Exception:
        return None


def encode_name_cursor(name: str, id_: UUID) -> str:
    payload = {"n": name, "id": str(id_)}
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_name_cursor(cursor_str: str) -> tuple[str, UUID] | None:
    try:
        raw = base64.urlsafe_b64decode(cursor_str.encode("ascii"))
        payload = json.loads(raw.decode("utf-8"))
        name = str(payload["n"])
        id_ = UUID(payload["id"])
        return name, id_
    except Exception:
        return None
