from collections.abc import Awaitable, Callable
from time import monotonic

from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUESTS = Counter(
    "feedio_http_requests_total",
    "Feedi HTTP requests.",
    labelnames=("method", "path", "status"),
)
REQUEST_DURATION = Histogram(
    "feedio_http_request_duration_seconds",
    "Feedi HTTP request duration.",
    labelnames=("method", "path"),
)
RATE_LIMIT_EXCEEDED = Counter(
    "feedio_rate_limit_exceeded_total",
    "Feedi rate limit exceeded count.",
    labelnames=("scope", "client_type"),
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        started_at = monotonic()
        response = await call_next(request)
        route = request.scope.get("route")
        path = getattr(route, "path", request.url.path)
        labels = {"method": request.method, "path": path}
        REQUESTS.labels(**labels, status=str(response.status_code)).inc()
        REQUEST_DURATION.labels(**labels).observe(monotonic() - started_at)
        return response
