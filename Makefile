.PHONY: bootstrap dev stack-up stack-status infra-up infra-down api web generate lint test verify

bootstrap:
	corepack enable
	corepack pnpm install
	cd apps/backend && UV_CACHE_DIR=.uv-cache uv sync --all-groups

dev:
	$(MAKE) stack-up
	corepack pnpm dev

stack-up:
	bash scripts/ensure-local-env.sh
	docker compose --env-file .env -f infra/compose/compose.dev.yaml up -d --build --wait

stack-status:
	docker compose --env-file .env -f infra/compose/compose.dev.yaml ps

infra-up: stack-up

infra-down:
	docker compose --env-file .env -f infra/compose/compose.dev.yaml down

api:
	cd apps/backend && .venv/bin/fastapi dev src/feedio/entrypoints/api.py

web:
	corepack pnpm --filter @feedio/web dev

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

verify: lint test
	corepack pnpm typecheck
	corepack pnpm build
