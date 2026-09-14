PNPM ?= pnpm

.PHONY: help bootstrap dev stack-up stack-status infra-up infra-monitoring infra-media infra-queue infra-full infra-down api worker web storybook build-storybook generate migrate lint lint-backend lint-web test test-backend test-web test-integration typecheck verify clean

help:
	@echo "feed.io Development Commands:"
	@echo ""
	@echo "  Environment & Infrastructure:"
	@echo "    make bootstrap        - Install node and python dependencies"
	@echo "    make dev              - Start core Docker infra (Postgres, Valkey, Mailpit)"
	@echo "    make infra-up         - Start core Docker infra"
	@echo "    make infra-down       - Stop all Docker containers"
	@echo "    make infra-media      - Start Garage S3 service"
	@echo "    make infra-queue      - Start RabbitMQ service"
	@echo "    make infra-monitoring - Start Grafana/Loki/GlitchTip"
	@echo "    make infra-full       - Start all Docker infrastructure services"
	@echo ""
	@echo "  Applications:"
	@echo "    make api              - Run FastAPI backend in development mode"
	@echo "    make worker           - Run background worker process"
	@echo "    make web              - Run Next.js web application"
	@echo "    make storybook        - Run Storybook development server"
	@echo "    make build-storybook  - Build static Storybook site"
	@echo ""
	@echo "  Code Generation & Database:"
	@echo "    make generate         - Export OpenAPI spec and generate Orval API client"
	@echo "    make migrate          - Run Alembic database migrations"
	@echo ""
	@echo "  Code Quality & Testing:"
	@echo "    make lint             - Run all linters (ruff, mypy, import-linter, eslint)"
	@echo "    make typecheck        - Run TypeScript type checks"
	@echo "    make test             - Run backend and frontend unit tests"
	@echo "    make test-integration - Run backend integration tests"
	@echo "    make verify           - Run full verification (lint, typecheck, test, build)"
	@echo "    make clean            - Clean build artifacts and caches"
	@echo ""

bootstrap:
	$(PNPM) install
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
	@echo "Core infrastructure is running in Docker (Postgres, Valkey, Mailpit)!"
	@echo "Optional services on-demand: 'make infra-media' (Garage), 'make infra-queue' (RabbitMQ), 'make infra-monitoring' (Grafana/Loki/GlitchTip)"
	@echo "Run 'make api' to start FastAPI backend (http://localhost:8000)"
	@echo "Run 'make web' to start Next.js frontend (http://localhost:3000)"
	@echo "Run 'make storybook' to start Storybook UI (http://localhost:6006)"
	@echo ""

api:
	bash scripts/ensure-local-env.sh
	cd apps/backend && .venv/bin/fastapi dev src/feedio/entrypoints/api.py

worker:
	bash scripts/ensure-local-env.sh
	cd apps/backend && .venv/bin/python -m feedio.entrypoints.worker

web:
	$(PNPM) --filter @feedio/web dev

storybook:
	$(PNPM) --filter @feedio/web storybook

build-storybook:
	$(PNPM) --filter @feedio/web build-storybook

stack-up:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile app up -d --build --wait

stack-status:
	docker compose --env-file .env -f infra/compose/compose.dev.yaml --profile app ps

generate:
	cd apps/backend && .venv/bin/python ../../scripts/export_openapi.py
	$(PNPM) generate:api

migrate:
	cd apps/backend && .venv/bin/alembic upgrade head

lint-backend:
	cd apps/backend && .venv/bin/ruff check .
	cd apps/backend && .venv/bin/mypy src
	cd apps/backend && .venv/bin/lint-imports

lint-web:
	$(PNPM) lint

lint:
	bash scripts/check-file-lines.sh
	$(MAKE) lint-backend
	$(MAKE) lint-web

test-backend:
	cd apps/backend && .venv/bin/pytest

test-web:
	$(PNPM) test

test: test-backend test-web

test-integration:
	cd apps/backend && set -a && . ../../.env && set +a && FEEDIO_INTEGRATION_DATABASE_URL="$$FEEDIO_DATABASE_URL" .venv/bin/pytest tests/integration

typecheck:
	$(PNPM) typecheck

verify: lint test typecheck
	$(PNPM) build

clean:
	rm -rf .turbo node_modules/.cache storybook-static apps/web/.next apps/web/storybook-static apps/backend/.pytest_cache apps/backend/.mypy_cache apps/backend/.ruff_cache
