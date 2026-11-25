from collections.abc import MutableMapping
from typing import Any

import jwt
import structlog
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from feedio.bootstrap.config import Settings
from feedio.shared.infrastructure.rate_limit import RateLimitResult, ValkeySlidingWindowRateLimiter
from feedio.shared.presentation.metrics import RATE_LIMIT_EXCEEDED

logger = structlog.get_logger(__name__)

EXEMPT_PATHS = (
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/health",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
)

EXEMPT_PREFIXES = (
    "/static",
    "/api/v1/storage/view/",
    "/api/v1/storage/preview/",
)


def get_client_ip(request: Request) -> str:
    """Extract client IP from CF-Connecting-IP, X-Forwarded-For, or client host."""
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


def extract_user_id_from_request(request: Request) -> str | None:
    """Best-effort extraction of user_id from Authorization header or cookie."""
    user = getattr(request.state, "current_user", None)
    if user is not None and hasattr(user, "id"):
        return str(user.id)

    auth_header = request.headers.get("Authorization")
    token: str | None = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif "feedio_access_token" in request.cookies:
        token = request.cookies.get("feedio_access_token")

    if token:
        try:
            unverified_claims = jwt.decode(token, options={"verify_signature": False})
            sub = unverified_claims.get("sub")
            if sub:
                return str(sub)
        except Exception:
            pass

    return None


class RateLimitMiddleware:
    """Pure ASGI Global API Rate Limiting Middleware with zero stream buffering."""

    def __init__(
        self,
        app: ASGIApp,
        limiter: ValkeySlidingWindowRateLimiter,
        settings: Settings,
    ) -> None:
        self.app = app
        self._limiter = limiter
        self._settings = settings

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        if (
            not self._settings.rate_limit_enabled
            or path in EXEMPT_PATHS
            or path.startswith(EXEMPT_PREFIXES)
        ):
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        client_ip = get_client_ip(request)
        user_id = extract_user_id_from_request(request)

        scope_name: str
        limit: int
        client_key: str

        is_strict_auth_mutation = (
            path
            in (
                "/api/v1/auth/login",
                "/api/v1/auth/register",
                "/api/v1/auth/forgot-password",
                "/api/v1/auth/reset-password",
            )
            and request.method in ("POST", "PUT", "PATCH")
        )
        if is_strict_auth_mutation:
            scope_name = "auth"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_auth_rpm)
            client_key = f"ip:{client_ip}"
        elif any(seg in path for seg in ("/avatar", "/upload", "/multipart")):
            scope_name = "upload"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_upload_rpm)
            client_key = f"user:{user_id}" if user_id else f"ip:{client_ip}"
        elif "/share-links" in path:
            scope_name = "share"
            limit = self._settings.get_effective_rate_limit(60)
            client_key = f"ip:{client_ip}"
        else:
            scope_name = "general"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_general_rpm)
            client_key = f"user:{user_id}" if user_id else f"ip:{client_ip}"

        rate_limit_key = f"{scope_name}:{client_key}"
        result: RateLimitResult = await self._limiter.check(
            key=rate_limit_key,
            limit=limit,
            window_seconds=60,
        )

        if not result.allowed:
            client_type = "user" if user_id else "ip"
            RATE_LIMIT_EXCEEDED.labels(scope=scope_name, client_type=client_type).inc()
            logger.warning(
                "rate_limit_exceeded",
                scope=scope_name,
                client_key=client_key,
                path=path,
                retry_after=result.retry_after,
            )
            headers = {
                "RateLimit-Limit": str(result.limit),
                "RateLimit-Remaining": "0",
                "RateLimit-Reset": str(result.reset_seconds),
                "Retry-After": str(result.retry_after),
            }
            origin = request.headers.get("origin")
            if origin and (
                origin in self._settings.cors_origins or "*" in self._settings.cors_origins
            ):
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
                headers["Access-Control-Allow-Methods"] = "*"
                headers["Access-Control-Allow-Headers"] = "*"

            error_body = {
                "type": "https://feedi.app/errors/rate-limit-exceeded",
                "title": "Rate Limit Exceeded",
                "status": status.HTTP_429_TOO_MANY_REQUESTS,
                "detail": (
                    f"Rate limit exceeded for {scope_name}. "
                    f"Please retry after {result.retry_after} seconds."
                ),
                "code": "RATE_LIMIT_EXCEEDED",
                "retry_after": result.retry_after,
            }
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=error_body,
                headers=headers,
            )
            await response(scope, receive, send)
            return

        limit_hdr = (b"ratelimit-limit", str(result.limit).encode("latin-1"))
        remaining_hdr = (b"ratelimit-remaining", str(result.remaining).encode("latin-1"))
        reset_hdr = (b"ratelimit-reset", str(result.reset_seconds).encode("latin-1"))

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                raw_headers: list[tuple[bytes, bytes]] = list(message.get("headers", []))
                raw_headers.extend((limit_hdr, remaining_hdr, reset_hdr))
                mutable_msg: MutableMapping[str, Any] = dict(message)
                mutable_msg["headers"] = raw_headers
                await send(mutable_msg)
                return
            await send(message)

        await self.app(scope, receive, send_wrapper)
