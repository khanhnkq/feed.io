from time import monotonic

from prometheus_client import Counter, Histogram
from starlette.types import ASGIApp, Message, Receive, Scope, Send

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


class MetricsMiddleware:
    """Pure ASGI Prometheus metrics middleware avoiding response stream buffering."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started_at = monotonic()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            route = scope.get("route")
            path = getattr(route, "path", scope.get("path", ""))
            method = scope.get("method", "GET")
            labels = {"method": method, "path": path}
            REQUESTS.labels(**labels, status=str(status_code)).inc()
            REQUEST_DURATION.labels(**labels).observe(monotonic() - started_at)
