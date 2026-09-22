from collections.abc import Awaitable, Callable
from typing import Any

import jwt
import structlog
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from feedio.bootstrap.config import Settings
from feedio.shared.infrastructure.rate_limit import RateLimitResult, ValkeySlidingWindowRateLimiter

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


def get_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For or client host."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in X-Forwarded-For is the originating client IP
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


def extract_user_id_from_request(request: Request) -> str | None:
    """Best-effort extraction of user_id from Authorization header or cookie."""
    # 1. Check request.state (if set by auth dependency)
    user = getattr(request.state, "current_user", None)
    if user is not None and hasattr(user, "id"):
        return str(user.id)

    # 2. Check Authorization Bearer header
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


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global API Rate Limiting Middleware with modern IETF Draft RFC headers."""

    def __init__(
        self,
        app: Any,
        limiter: ValkeySlidingWindowRateLimiter,
        settings: Settings,
    ) -> None:
        super().__init__(app)
        self._limiter = limiter
        self._settings = settings

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        path = request.url.path

        # 1. Check if rate limiting is enabled or path is exempt
        is_exempt = path in EXEMPT_PATHS or path.startswith("/static")
        if not self._settings.rate_limit_enabled or is_exempt:
            return await call_next(request)

        # 2. Determine rate limit policy, scope, and key
        client_ip = get_client_ip(request)
        user_id = extract_user_id_from_request(request)

        scope: str
        limit: int
        client_key: str

        if path.startswith("/api/v1/auth/"):
            # Auth endpoints (login, register, forgot-pass): strictly by IP to stop brute-force
            scope = "auth"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_auth_rpm)
            client_key = f"ip:{client_ip}"
        elif any(seg in path for seg in ("/avatar", "/upload", "/multipart")):
            # Media uploads: by user if authenticated, else IP
            scope = "upload"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_upload_rpm)
            client_key = f"user:{user_id}" if user_id else f"ip:{client_ip}"
        elif "/share-links" in path:
            # Public share preview: by IP
            scope = "share"
            limit = self._settings.get_effective_rate_limit(60)
            client_key = f"ip:{client_ip}"
        else:
            # General CRUD API
            scope = "general"
            limit = self._settings.get_effective_rate_limit(self._settings.rate_limit_general_rpm)
            client_key = f"user:{user_id}" if user_id else f"ip:{client_ip}"

        rate_limit_key = f"{scope}:{client_key}"
        result: RateLimitResult = await self._limiter.check(
            key=rate_limit_key,
            limit=limit,
            window_seconds=60,
        )

        # 3. If rate limit exceeded, return HTTP 429 with modern IETF headers
        if not result.allowed:
            logger.warning(
                "rate_limit_exceeded",
                scope=scope,
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
            error_body = {
                "type": "https://feed.io/errors/rate-limit-exceeded",
                "title": "Rate Limit Exceeded",
                "status": status.HTTP_429_TOO_MANY_REQUESTS,
                "detail": (
                    f"Rate limit exceeded for {scope}. "
                    f"Please retry after {result.retry_after} seconds."
                ),
                "code": "RATE_LIMIT_EXCEEDED",
                "retry_after": result.retry_after,
            }
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=error_body,
                headers=headers,
            )

        # 4. If allowed, execute request and attach modern IETF headers
        response = await call_next(request)
        response.headers["RateLimit-Limit"] = str(result.limit)
        response.headers["RateLimit-Remaining"] = str(result.remaining)
        response.headers["RateLimit-Reset"] = str(result.reset_seconds)
        return response
