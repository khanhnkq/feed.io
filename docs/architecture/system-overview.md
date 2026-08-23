# System overview

```mermaid
flowchart LR
    Browser --> Nginx
    Nginx --> Web[Next.js]
    Web --> API[FastAPI]
    Browser -->|multipart| Garage
    API --> PostgreSQL
    API --> RabbitMQ
    API --> Valkey
    RabbitMQ --> Worker[Celery + FFmpeg]
    Worker --> Garage
    Browser <-->|Authorization Code + PKCE| Keycloak
    API -->|code, refresh, revoke| Keycloak
    API --> Prometheus
    Worker --> Prometheus
    PostgreSQL --> PostgresExporter[PostgreSQL exporter]
    PostgresExporter --> Prometheus
    RabbitMQ --> Prometheus
    Alloy --> Loki
    Prometheus --> Grafana
    Loki --> Grafana
    API -. errors .-> GlitchTip
```

The deployment unit is a modular monolith split into three processes: Next.js web, FastAPI API and a Python worker. PostgreSQL is authoritative. Valkey holds ephemeral cache/realtime state, RabbitMQ owns durable job delivery, and Garage owns media objects. All development dependencies are self-hosted through Docker Compose.

## Runtime health

- `/api/v1/health/live` verifies that the API process can serve requests.
- `/api/v1/health/ready` probes PostgreSQL, Valkey, RabbitMQ and Garage concurrently.
- The worker periodically performs the same probes and publishes `feedio_worker_ready`.
- Prometheus scrapes API, worker, PostgreSQL and RabbitMQ metrics.
- Alloy discovers Compose containers and forwards their logs to Loki.
- The provisioned Grafana dashboard combines service health, latency, dependency state and logs.

Operational details live in the [local stack runbook](../operations/local-stack.md).

## Identity and tenant boundary

FastAPI is the browser OIDC BFF. Keycloak tokens live in `HttpOnly` cookies; Axios sends cookies and a double-submit CSRF header but cannot read either token. The API accepts a request only after this sequence:

```mermaid
sequenceDiagram
    participant B as Browser/Axios
    participant A as FastAPI
    participant K as Keycloak
    participant P as PostgreSQL
    B->>A: cookie + X-Organization-Id + CSRF on writes
    A->>K: JWKS (cached)
    A->>A: verify signature, issuer, audience, expiry
    A->>P: upsert user projection by Keycloak sub
    A->>P: verify active organization membership
    A->>P: SET LOCAL organization and user context
    A->>P: organization-scoped repository query
    P-->>A: tenant data only
```

Application filters are mandatory now. PostgreSQL RLS remains intentionally deferred until all tenant tables and database roles exist; see [ADR-0002](../adr/0002-postgresql-tenant-isolation.md) and [ADR-0003](../adr/0003-oidc-bff-cookie-session.md).

## Dependency rules

- Domain code is framework-free.
- Application code orchestrates use cases through small ports.
- Infrastructure implements I/O ports.
- Presentation translates HTTP and WebSocket messages.
- Composition roots are the only place that binds concrete adapters.
- Frontend routes compose feature modules; React components never call Axios directly.
