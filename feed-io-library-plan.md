# Feed.io Library and Self-Hosted Service Evaluation Plan

## Goals and Constraints

Minimize unnecessary boilerplate without resorting to managed cloud or proprietary SaaS vendors. All stateful services run on self-hosted servers managed by the project team. Feed.io code focuses strictly on media workflows, project authorization, and review collaboration. Stable releases are pinned via `uv.lock`, `pnpm-lock.yaml`, and immutable container digests rather than floating `latest` tags in production.

## Backend — FastAPI / Python

| Capability | Library / Tool | Code Reduced |
|---|---|---|
| Runtime & Packaging | `uv`, `fastapi[standard]`, `pydantic-settings` | Environment parsing, dependency injection, validation, OpenAPI |
| ORM & Schemas | `sqlmodel`, `psycopg[binary,pool]`, `alembic` | Model redundancy, PostgreSQL connection pooling, migrations |
| API Utilities | `fastapi-pagination`, `orjson` | Standardized keyset pagination and high-speed serialization |
| Auth & Cryptography | `PyJWT[crypto]`, `pwdlib[argon2]` | Standard JWT validation, Argon2id password hashing and verification |
| Object Storage | `boto3` | Presigned URLs and S3 multipart integration with Garage |
| Background Queues | `celery`, `pyamqp` | RabbitMQ durable queues, exponential backoff, and scheduling |
| Realtime Dispatch | `python-socketio`, `redis[hiredis]` client | WebSocket rooms, reconnection handling, fan-out over Valkey |
| Email Delivery | `aiosmtplib`, `jinja2` | Asynchronous SMTP delivery and templated transaction emails |
| Structured Logging | `structlog`, `sentry-sdk[fastapi]` | Contextual JSON logs and exception capture to self-hosted GlitchTip |
| Metrics Telemetry | `prometheus-fastapi-instrumentator` | HTTP latency, error rates, and connection gauges |
| Test Suites | `pytest`, `pytest-asyncio`, `pytest-cov`, `testcontainers` | True-to-prod async integration testing with containerized services |
| Code Quality | `ruff`, `mypy`, `import-linter`, `pre-commit` | Automated formatting, static type checking, and boundary enforcement |

**SQLModel Guidelines:** Maintain clean separation between `Table`, `Create`, `Update`, and `Read` schemas. Use core SQLAlchemy constructs for advanced indexes, window functions, and transactions. Alembic remains the single source of schema migrations; `create_all()` is banned in production.

**Identity Management:** FastAPI manages the complete SaaS auth lifecycle. PostgreSQL stores Argon2id password hashes and SHA-256 hashes of refresh/action tokens; access and refresh tokens are strictly stored in HttpOnly cookies.

## Frontend — Next.js / TypeScript

| Capability | Library / Tool | Code Reduced |
|---|---|---|
| Monorepo Tooling | `pnpm` workspaces + `turbo` | Dependency deduplication, parallel script caching |
| Component Primitives | `shadcn/ui`, Tailwind CSS, `lucide-react`, `sonner` | Accessible headless components, icons, and toast notifications |
| API Integration | `axios`, `@tanstack/react-query`, `orval` | Automated contract generation, query caching, and typed mutations |
| Form Handling | `react-hook-form`, `zod`, `@hookform/resolvers` | Controlled form state, schema validation, and field errors |
| Upload Engine | `@uppy/core`, `@uppy/react`, `@uppy/aws-s3` | Resilient chunked multipart S3 uploads with progress & retry |
| Video Playback | `@vidstack/react`, `hls.js` | Frame-accurate HLS rendering, audio waveforms, and player controls |
| Annotation Canvas | `react-konva`, `konva` | Layered vector drawings, normalized coordinate scaling |
| State Management | `zustand`, `socket.io-client` | Player state, tool selection, and WebSocket room subscriptions |
| Table Data | `@tanstack/react-table`, `date-fns`, `nuqs` | URL state query synchronization, table filtering, and sorting |
| Error Monitoring | `@sentry/nextjs` | Client-side error tracking connected to self-hosted GlitchTip |
| Verification | `vitest`, Testing Library, `msw`, `playwright` | Component tests, mock service workers, and end-to-end user flows |

```text
SQLModel/Pydantic → FastAPI openapi.json → Orval
                  → TypeScript types + Axios client + React Query hooks + MSW mocks
```

No hand-crafted API interfaces or manual query hooks. Orval utilizes a centralized Axios instance configured with `withCredentials`, CSRF double-submit token injection, and automated 401 token refresh interceptors.

## Self-Hosted Infrastructure Services

| Responsibility | Technology | Deployment Details |
|---|---|---|
| Edge Ingress & TLS | Cloudflare Tunnel (`cloudflared`) | Zero public inbound ports, automated Edge TLS/SSL, DDoS mitigation |
| Database | PostgreSQL 17 | Primary relational store; isolated databases for Feed.io and GlitchTip |
| Identity & RBAC | Feed.io API | First-party sessions, Argon2id, and organization-scoped roles |
| Object Storage | Garage S3 | S3-compatible engine; single node local, multi-node layout for production |
| Message Broker | RabbitMQ 4 | Durable Celery task delivery, dead-letter exchanges, management console |
| Cache & Realtime | Valkey 8 | High-speed cache, token bucket rate limiting, and pub-sub bus |
| Dev Mailbox | Mailpit | Local development email sandbox with web UI inspector |
| Prod SMTP | Stalwart Mail Server / SMTP Relay | Production email delivery with DKIM, SPF, and DMARC support |
| Error Tracking | GlitchTip | Open-source Sentry-compatible crash reporting platform |
| Observability | Prometheus + Grafana + Loki + Alloy | Unified telemetry dashboards, metrics scraping, and container log aggregation |
| Backup & DR | PostgreSQL dump + restic + rclone | Automated binary dumps, 30-day retention, and off-site replication |

## Core Service Data Flows

- **Authentication:** Browser → FastAPI credentials verification → Argon2id validation → hashed PostgreSQL session → HttpOnly cookies → Feed.io RBAC.
- **Upload Pipeline:** Uppy → FastAPI presigned URL generation → direct browser upload to Garage S3 → Cloudflare Tunnel secure streaming.
- **Transcoding:** FastAPI/outbox → Celery/RabbitMQ → FFmpeg worker → Garage S3 → completion event emitted over Valkey/WebSocket.
- **Notification:** Celery → Jinja template rendering → SMTP delivery; Mailpit captures messages locally.
- **Observability:** JSON app logs → Grafana Alloy → Loki; system metrics → Prometheus → Grafana; exceptions → GlitchTip.

## Banned Patterns and Anti-Goals

- No external SaaS identity providers (Auth0/Clerk), email services (SendGrid/Resend), or cloud S3 services as hard runtime dependencies.
- No Redux or complex global stores; use Zustand for player/tool state and TanStack Query for server state.
- No Kafka or Kubernetes at initial workloads under 1,000 users.
- Never write custom crypto, password hashing, or media players from scratch; leverage proven open-source implementations.
- Every hand-written source file must remain $\le 500$ physical lines (CI warns at 400 lines per [Engineering Standards](./feed-io-engineering-standards.md)).
