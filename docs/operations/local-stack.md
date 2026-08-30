# Local self-hosted stack

This runbook covers the development platform started by `make stack-up`. It uses only local Docker services and requires no managed cloud account.

## Start and stop

```bash
# Start core development infrastructure only (PostgreSQL, Valkey, Mailpit ~36MB RAM)
make dev         # or make infra-up

# Start optional / heavy services on demand
make infra-media       # Start Garage S3 object storage
make infra-queue       # Start RabbitMQ message broker
make infra-monitoring  # Start GlitchTip, Prometheus, Grafana, Loki, Alloy

# Start all infrastructure services
make infra-full

# Start full containerized stack (API, Web, Nginx + infra)
make stack-up
make stack-status

# Stop and remove all containers across all profiles
make infra-down
```

The first command generates `.env` with mode `600` when it is missing, and starts the core services. `infra-down` removes containers and the network across all profiles but deliberately retains named volumes.

Do not use `docker compose down --volumes` unless you intentionally want to erase local databases, objects, queues, mail, metrics, logs and dashboards.

## Service map

| Concern | Service | Persistent volume | Local endpoint |
|---|---|---|---|
| Reverse proxy | Nginx | cache | `http://localhost:8088` |
| Web | Next.js | no | `http://localhost:3000` |
| API | FastAPI | no | `http://localhost:8000` |
| Worker | Python worker | no | `http://localhost:9101/metrics` |
| Database | PostgreSQL | yes | `localhost:5432` |
| Schema migration | Alembic one-shot container | no | internal only |
| Cache | Valkey | yes | `localhost:6379` |
| Queue | RabbitMQ | yes | `http://localhost:15672` |
| Object storage | Garage | yes | `http://localhost:3900` |
| Identity/session store | FastAPI + PostgreSQL | yes | Feed.io API |
| Development mail | Mailpit | yes | `http://localhost:8025` |
| Error tracking | GlitchTip | PostgreSQL/Valkey | `http://localhost:8001` |
| Metrics | Prometheus | yes | `http://localhost:9090` |
| Logs | Loki | yes | `http://localhost:3100` |
| Log collector | Alloy | no | `http://localhost:12345` |
| Dashboards | Grafana | yes | `http://localhost:3001` |

The Compose file binds administrative ports to `127.0.0.1` where practical. Nginx is the public application entry point.

The `migrate` service runs `alembic upgrade head` after PostgreSQL becomes healthy. API and worker start only after that one-shot container exits successfully, so `make stack-up` cannot silently serve an outdated schema.

## Local authentication

1. Open `http://localhost:8088/register` and create an account with a name, email and password.
2. Open Mailpit at `http://localhost:8025`, select the verification message and follow its link.
3. Sign in at `http://localhost:8088/login`. The verified account is routed to `/onboarding` because it has no workspace yet.
4. Create the agency/workspace. Feed.io creates the organization and owner membership together, then redirects to the workspace overview at `/dashboard`.
5. Open `/projects` from the workspace dashboard when you want to create the first project.
6. A signed-out protected request redirects to `/login`; an authenticated account without a workspace redirects to `/onboarding`.

Forgot-password mail is also captured by Mailpit. Completing a reset revokes every existing session. Use the Nginx URL consistently so cookie scope matches the production-style route.

Cookie policy:

| Cookie | JavaScript | Path | Purpose |
|---|---|---|---|
| `feedio_access_token` | HttpOnly | `/api` | Five-minute API access token |
| `feedio_refresh_token` | HttpOnly | `/api/v1/auth` | Rotated refresh JWT backed by a hashed PostgreSQL session |
| `feedio_csrf_token` | readable | `/` | Double-submit value copied to `X-CSRF-Token` |

All cookies are `SameSite=Lax`. Production must terminate TLS and set `FEEDIO_AUTH_COOKIE_SECURE=true`. A successful refresh replaces the stored refresh-token hash. Reusing an older refresh token revokes that session. Logout revokes the current session and clears all three cookies.

Verify discovery and tenant context:

```bash
curl --fail http://localhost:8088/api/v1/auth/me
make test-integration
```

## Secrets

- `.env.example` documents every required variable with placeholders.
- `scripts/ensure-local-env.sh` generates cryptographically random local values.
- `.env` is git-ignored and must never be copied into an issue, log or commit.
- Grafana and RabbitMQ usernames are documented in `.env`; passwords and the auth JWT secret are generated locally.
- Production deployments should use encrypted SOPS + age files or an equivalent self-hosted secret store.

Changing `.env` does not rewrite credentials already stored in a named volume. Preserve data by rotating the credential inside that service, or deliberately recreate the specific development volume.

## Health and observability

```bash
curl --fail http://localhost:8088/health
curl --fail http://localhost:8000/api/v1/health/ready
curl --fail http://localhost:9101/metrics
curl --fail http://localhost:9090/-/ready
curl --fail http://localhost:3100/ready
```

API readiness returns one status and latency for PostgreSQL, Valkey, RabbitMQ and Garage. A failed dependency produces HTTP `503`. The worker exposes `feedio_worker_ready` and dependency metrics on port `9101`.

Prometheus scrapes the API, worker, PostgreSQL exporter and RabbitMQ. Alloy reads Docker logs and writes them to Loki. Grafana automatically provisions both data sources and the **Feed.io / Feed.io Runtime Overview** dashboard.

## Garage bootstrap

`garage-init` is a one-shot service. It assigns the single local node, applies layout version one, imports the S3 key and grants ownership of the `feedio-media` bucket. Re-running it is safe.

```bash
docker compose --env-file .env -f infra/compose/compose.dev.yaml exec garage /garage status
docker compose --env-file .env -f infra/compose/compose.dev.yaml exec garage /garage bucket list
```

## Troubleshooting

Start with service state and narrowly scoped logs:

```bash
make stack-status
docker compose --env-file .env -f infra/compose/compose.dev.yaml logs --tail=100 api worker
docker compose --env-file .env -f infra/compose/compose.dev.yaml logs --tail=100 garage mailpit glitchtip
```

Common causes:

- **A service rejects a password after `.env` changed:** the persistent volume still contains the old credential. Rotate it in place or recreate only that disposable local volume.
- **Verification mail is missing:** inspect API logs, confirm Mailpit is healthy and verify `FEEDIO_SMTP_HOST=mailpit` inside the API container.
- **API returns `401`:** confirm the access cookie exists; the Axios client should refresh it once, otherwise sign in again.
- **API returns `403` for a project:** the user is authenticated but is not an active member of the selected `X-Organization-Id`, or the write is missing the CSRF header.
- **Garage bootstrap does not complete:** inspect `garage` and `garage-init`; confirm `GARAGE_RPC_SECRET` contains exactly 64 hexadecimal characters.
- **Readiness returns `503`:** inspect the named dependency and compare its URL in the API container environment.
- **A port is occupied:** stop the conflicting host process or change the local-only published port in Compose.
- **Loki is warming up:** its `/ready` endpoint may briefly return `503` while the ingester joins its single-node ring.

## Production boundary

This topology teaches the complete platform locally; it is not a production deployment. Production needs TLS-only cookies, a high-entropy JWT secret, authenticated SMTP, abuse rate limits, PostgreSQL backups/PITR, multi-node Garage, durable monitoring retention, alert routing, resource limits and tested restore/rollback procedures.
