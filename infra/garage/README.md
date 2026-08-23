# Garage bootstrap

The development stack starts one Garage node with replication factor `1`. The one-shot `garage-init` service assigns local capacity, applies the first layout and imports the configured media key and bucket. The bootstrap is idempotent, so `make stack-up` can run repeatedly.

Inspect the resulting node and bucket without exposing key material:

```bash
docker compose --env-file .env -f infra/compose/compose.dev.yaml exec garage /garage status
docker compose --env-file .env -f infra/compose/compose.dev.yaml exec garage /garage bucket list
```

Non-secret node settings live in `garage.toml`; RPC, admin, metrics and S3 credentials are injected from the git-ignored `.env`. Production must use at least three nodes in separate failure zones. Never reuse development secrets.
