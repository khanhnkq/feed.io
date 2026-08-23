# Local self-hosted stack

This runbook covers the development platform started by `make stack-up`. It uses only local Docker services and requires no managed cloud account.

## Start and stop

```bash
make stack-up
make stack-status
make infra-down
```

The first command generates `.env` with mode `600` when it is missing, builds Feed.io and waits for service healthchecks. `infra-down` removes containers and the network but deliberately retains named volumes.

Do not use `docker compose down --volumes` unless you intentionally want to erase local databases, objects, queues, mail, metrics, logs and dashboards.

## Service map

| Concern | Service | Persistent volume | Local endpoint |
|---|---|---|---|
| Reverse proxy | Nginx | cache | `http://localhost:8088` |
| Web | Next.js | no | `http://localhost:3000` |
| API | FastAPI | no | `http://localhost:8000` |
| Worker | Python worker | no | `http://localhost:9101/metrics` |
| Database | PostgreSQL | yes | `localhost:5432` |
| Cache | Valkey | yes | `localhost:6379` |
| Queue | RabbitMQ | yes | `http://localhost:15672` |
| Object storage | Garage | yes | `http://localhost:3900` |
| Identity | Keycloak | PostgreSQL | `http://localhost:8080` |
| Development mail | Mailpit | yes | `http://localhost:8025` |
| Error tracking | GlitchTip | PostgreSQL/Valkey | `http://localhost:8001` |
| Metrics | Prometheus | yes | `http://localhost:9090` |
| Logs | Loki | yes | `http://localhost:3100` |
| Log collector | Alloy | no | `http://localhost:12345` |
| Dashboards | Grafana | yes | `http://localhost:3001` |

The Compose file binds administrative ports to `127.0.0.1` where practical. Nginx is the public application entry point.

## Secrets

- `.env.example` documents every required variable with placeholders.
- `scripts/ensure-local-env.sh` generates cryptographically random local values.
- `.env` is git-ignored and must never be copied into an issue, log or commit.
- Grafana, Keycloak and RabbitMQ usernames are documented in `.env`; their passwords are generated locally.
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
docker compose --env-file .env -f infra/compose/compose.dev.yaml logs --tail=100 garage keycloak glitchtip
```

Common causes:

- **A service rejects a password after `.env` changed:** the persistent volume still contains the old credential. Rotate it in place or recreate only that disposable local volume.
- **Garage bootstrap does not complete:** inspect `garage` and `garage-init`; confirm `GARAGE_RPC_SECRET` contains exactly 64 hexadecimal characters.
- **Readiness returns `503`:** inspect the named dependency and compare its URL in the API container environment.
- **A port is occupied:** stop the conflicting host process or change the local-only published port in Compose.
- **Loki is warming up:** its `/ready` endpoint may briefly return `503` while the ingester joins its single-node ring.

## Production boundary

This topology teaches the complete platform locally; it is not a production deployment. Production needs TLS, restricted admin networks, Keycloak production mode, PostgreSQL backups/PITR, multi-node Garage, durable monitoring retention, alert routing, resource limits and tested restore/rollback procedures.
