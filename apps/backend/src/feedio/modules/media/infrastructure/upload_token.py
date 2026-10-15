import time
from typing import Any

import jwt


class InvalidUploadTokenError(Exception):
    """Raised when an upload token is invalid, expired, or tampered with."""


def generate_upload_token(
    secret: str,
    storage_key: str,
    mime_type: str = "application/octet-stream",
    expires_in: int = 3600,
    upload_type: str = "single",
    upload_id: str | None = None,
    part_number: int | None = None,
) -> str:
    """Generate a signed HMAC-SHA256 JWT for secure streaming uploads."""
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": "storage_upload",
        "key": storage_key,
        "mime": mime_type,
        "type": upload_type,
        "iat": now,
        "exp": now + expires_in,
    }
    if upload_id is not None:
        payload["upload_id"] = upload_id
    if part_number is not None:
        payload["part"] = part_number

    return jwt.encode(payload, secret, algorithm="HS256")


def verify_upload_token(token: str, secret: str) -> dict[str, Any]:
    """Verify and decode a signed upload token."""
    try:
        payload: dict[str, Any] = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("sub") != "storage_upload":
            raise InvalidUploadTokenError("Invalid token subject")
        if "key" not in payload:
            raise InvalidUploadTokenError("Missing storage key claim in token")
        return payload
    except jwt.ExpiredSignatureError as e:
        raise InvalidUploadTokenError("Upload token has expired") from e
    except jwt.PyJWTError as e:
        raise InvalidUploadTokenError(f"Upload token validation failed: {e}") from e
