.PHONY: bootstrap dev stack-up stack-status infra-up infra-monitoring infra-media infra-queue infra-full infra-down api worker web generate lint test test-integration verify

bootstrap:
	corepack enable
	corepack pnpm install
	cd apps/backend && UV_CACHE_DIR=.uv-cache uv sync --all-groups

infra-up:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml up -d

infra-monitoring:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile monitoring up -d

infra-media:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile media up -d

infra-queue:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile queue up -d

infra-full:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile full up -d

infra-down:
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile "*" down

dev: infra-up
	@echo ""
	@echo "🚀 Core infrastructure is running in Docker (Postgres, Valkey, Mailpit)!"
	@echo "👉 Optional services on-demand: 'make infra-media' (Garage), 'make infra-queue' (RabbitMQ), 'make infra-monitoring' (Grafana/Loki/GlitchTip)"
	@echo "👉 Run 'make api' to start FastAPI backend (http://localhost:8000)"
	@echo "👉 Run 'make web' to start Next.js frontend (http://localhost:3000)"
	@echo ""

api:
	bash scripts/ensure-local-env.sh
	cd apps/backend && .venv/bin/fastapi dev src/feedio/entrypoints/api.py

worker:
	bash scripts/ensure-local-env.sh
	cd apps/backend && .venv/bin/python -m feedio.entrypoints.worker

web:
	corepack pnpm --filter @feedio/web dev

stack-up:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile app up -d --build --wait

stack-status:
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile app ps

generate:
	cd apps/backend && .venv/bin/python ../../scripts/export_openapi.py
	corepack pnpm generate:api

lint:
	bash scripts/check-file-lines.sh
	cd apps/backend && .venv/bin/ruff check .
	cd apps/backend && .venv/bin/mypy src
	cd apps/backend && .venv/bin/lint-imports
	corepack pnpm lint

test:
	cd apps/backend && .venv/bin/pytest
	corepack pnpm test

test-integration:
	cd apps/backend && set -a && . ../../.env && set +a && FEEDIO_INTEGRATION_DATABASE_URL="$$FEEDIO_DATABASE_URL" .venv/bin/pytest tests/integration

verify: lint test
	corepack pnpm typecheck
	corepack pnpm build
