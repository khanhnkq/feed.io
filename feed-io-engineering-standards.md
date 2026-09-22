# Feed.io Engineering Standards

## 1. Mandatory Rules

- Every file authored by the team must be **no more than 500 physical lines**, including empty lines and comments.
- CI issues a warning when a file reaches **400 lines**, and fails when a file exceeds **500 lines**.
- Do not bypass this rule using arbitrary names like `service_part1.py`, `utils2.ts`, or sequential number suffixes; files must be decomposed strictly by domain responsibility and business context.
- Exceptions are strictly reserved for machine-generated or non-manual files: `uv.lock`, `pnpm-lock.yaml`, Orval output, OpenAPI snapshot, minified/vendor code, and binary fixtures. The exemption list must be explicitly declared in CI scripts.
- Generated code resides in designated `generated/` directories and must not contain custom business logic.
- A pull request must not introduce circular dependencies, cross-layer imports, or direct imports into the internals of another module.

## 2. Recommended Thresholds

| Component | Target | Hard Limit |
|---|---:|---:|
| Function/method | 5–20 lines | 40 lines |
| Class | 50–150 lines | 300 lines |
| React component | 50–200 lines | 300 lines |
| Hook/use case | 30–120 lines | 200 lines |
| Router/controller | 50–150 lines | 250 lines |
| Source/test/config file | < 400 lines | 500 lines |

When approaching thresholds, split by use case, sub-component, policy, schema, or adapter. Do not split purely for line count reduction without cohesive boundaries.

## 3. Monorepo Structure

```text
feed.io/
├── apps/
│   ├── backend/                    # Single Python package, multiple deployment entrypoints
│   │   ├── pyproject.toml
│   │   ├── src/feedio/
│   │   │   ├── entrypoints/
│   │   │   │   ├── api.py         # FastAPI composition root
│   │   │   │   ├── worker.py      # Celery worker entrypoint
│   │   │   │   └── scheduler.py   # Celery beat entrypoint
│   │   │   ├── bootstrap/
│   │   │   │   ├── config.py
│   │   │   │   ├── database.py
│   │   │   │   ├── logging.py
│   │   │   │   └── wiring.py
│   │   │   ├── modules/
│   │   │   │   ├── identity/
│   │   │   │   ├── organizations/
│   │   │   │   ├── projects/
│   │   │   │   ├── media/
│   │   │   │   ├── reviews/
│   │   │   │   ├── sharing/
│   │   │   │   ├── notifications/
│   │   │   │   └── audit/
│   │   │   └── shared/
│   │   │       ├── domain/
│   │   │       ├── application/
│   │   │       └── infrastructure/
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── contract/
│   └── web/
│       ├── src/
│       │   ├── app/                # Next.js routes/layouts, composition only
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── organizations/
│       │   │   ├── projects/
│       │   │   ├── assets/
│       │   │   ├── upload/
│       │   │   ├── review/
│       │   │   ├── sharing/
│       │   │   └── notifications/
│       │   ├── components/ui/      # UI primitives (shadcn), zero business logic
│       │   ├── server/             # Auth.js, server-only clients, environment
│       │   ├── shared/             # Code shared across >=2 business modules
│       │   └── styles/
│       ├── public/
│       └── tests/e2e/
├── packages/
│   ├── api-client/                 # Orval-generated Axios client and TanStack Query hooks
│   ├── ui/                         # Shared UI tokens and components
│   ├── eslint-config/
│   └── typescript-config/
├── infra/
│   ├── compose/
│   │   ├── compose.base.yaml
│   │   ├── compose.dev.yaml
│   │   ├── compose.observability.yaml
│   │   └── compose.production.yaml
│   ├── cloudflare/                 # Cloudflare Tunnel ingress configuration
│   ├── garage/
│   ├── monitoring/
│   └── backup/
├── scripts/
│   ├── check-file-lines.sh
│   └── check-boundaries.sh
├── docs/
│   ├── architecture/
│   ├── adr/
│   └── runbooks/
├── pnpm-workspace.yaml
├── turbo.json
└── Makefile
```

Never duplicate backend code into separate `apps/api` and `apps/worker` folders. They are separate processes executed from the single `apps/backend` package to share domain and application code.

## 4. Backend Module Structure

Every business module follows the exact same layered pattern. Only create directories when populated with real code:

```text
modules/media/
├── domain/
│   ├── entities.py
│   ├── value_objects.py
│   ├── events.py
│   └── errors.py
├── application/
│   ├── commands/
│   │   ├── create_upload.py
│   │   └── complete_upload.py
│   ├── queries/
│   │   └── get_asset_version.py
│   ├── dto.py
│   └── ports.py
├── infrastructure/
│   ├── models.py
│   ├── repository.py
│   ├── garage_storage.py
│   └── celery_tasks.py
├── presentation/
│   ├── router.py
│   ├── schemas.py
│   └── dependencies.py
└── public.py
```

### Dependency Direction

```text
presentation ───────→ application ───────→ domain
infrastructure ─────→ application ports ─→ domain
bootstrap ──────────→ presentation + infrastructure
```

- `domain`: Pure Python; zero imports from FastAPI, SQLModel, Celery, or boto3.
- `application`: Orchestration and use cases; depends only on domain entities and narrow `Protocol` ports.
- `infrastructure`: SQLModel models, Argon2/JWT, Garage S3, RabbitMQ, Valkey, and SMTP implementations.
- `presentation`: FastAPI routers, request/response schemas, and auth dependencies; zero business rules.
- `bootstrap`: The sole place where concrete adapters are wired to ports.
- Other modules may only import from `modules/<name>/public.py`; internal layers are strictly private.
- `shared/` is not a catch-all dumping ground for `utils`; code only enters `shared` when at least two modules need it and it carries no specific business domain logic.

## 5. Frontend Module Structure

```text
modules/review/
├── api/
│   ├── query_keys.ts
│   └── realtime_adapter.ts
├── components/
│   ├── review_player.tsx
│   ├── comment_list.tsx
│   └── annotation_canvas.tsx
├── hooks/
│   ├── use_review_session.ts
│   └── use_realtime_comments.ts
├── model/
│   ├── review_state.ts
│   └── review_types.ts
├── schemas/
│   └── comment_schema.ts
├── stores/
│   └── player_store.ts
└── index.ts
```

- `app/` is responsible only for reading route parameters, invoking module APIs, and composing views; route files contain zero business logic.
- Modules export their public API exclusively through `index.ts`; deep imports across module internals are prohibited.
- Server state is managed via Orval/TanStack Query; local interactive UI state is managed via Zustand. Do not duplicate server state into Zustand.
- `components/ui` must not import business modules. Domain-specific components belong inside their respective module.
- Direct Axios calls are restricted to `packages/api-client` or module API adapters; never call Axios directly inside React components.
- Directives like `'use client'` must remain at the lowest leaf component level possible; server-only code must not leak into the client bundle.

## 6. Practical SOLID Principles

- **SRP (Single Responsibility):** Each file, class, or function has one reason to change. Routers do not manage database transactions; repositories do not send emails.
- **OCP (Open/Closed):** Add rendition strategies, notification channels, or share policies via new implementations, not by expanding central `if/else` ladders.
- **LSP (Liskov Substitution):** All adapters honor port contracts with identical error semantics and idempotency guarantees; contract tests run identically for in-memory fakes and production adapters.
- **ISP (Interface Segregation):** Keep ports fine-grained and use-case focused (`ObjectReader`, `ObjectWriter`, `MailSender`) rather than monolithic infrastructure interfaces.
- **DIP (Dependency Inversion):** Application layers depend on abstract `Protocol` definitions; `bootstrap` injects concrete adapters (`GarageStorage`, `StalwartMailer`, `PasswordManager`, `TokenManager`).
- Do not create interfaces for internal classes that have only one implementation unless they sit at an I/O boundary or require test substitution.

## 7. Naming and File Conventions

### Python

- File/module: `snake_case.py`; class: `PascalCase`; function/variable: `snake_case`; constant: `SCREAMING_SNAKE_CASE`.
- Command use cases use imperative verbs: `create_project.py`; queries use descriptive prefixes: `get_`, `list_`, `search_`.
- DTOs and schemas carry explicit suffixes: `CreateProjectInput`, `ProjectView`, `ProjectTable`.
- Async functions use `async` only when performing genuine asynchronous I/O; avoid redundant `async_` prefixes.

### TypeScript / React

- File: `snake_case.ts`/`.tsx`; component/type: `PascalCase`; function/variable: `camelCase`; constant: `SCREAMING_SNAKE_CASE`.
- Hooks use the `use_` prefix in file names and `useX` in exported symbol identifiers.
- Avoid ambiguous names such as `utils`, `helpers`, `common`, `manager`, or `service` when a precise domain term is available.
- One primary React component per file; small auxiliary components may be colocated only if non-reusable and line counts remain well below limits.

## 8. Quality Gates in CI

1. `check-file-lines.sh` counts physical lines: warning at `>=400`, non-zero exit failure at `>500`.
2. Ruff + mypy enforce backend code quality; `import-linter` blocks reverse dependencies and cross-module internal imports.
3. ESLint `max-lines` + `eslint-plugin-boundaries`; `dependency-cruiser` prevents circular references and layer violations.
4. Unit, integration, and contract tests must pass before container image builds.
5. Orval regeneration check: CI fails if generated client output drifts from committed code.
6. Docker and Compose configuration validation, automated secret scans, and dependency license audits.
7. Pull request checklist verifies proper module placement and rejects unneeded generic utilities or speculative abstractions.

## 9. Definition of Done

- Zero project source files exceed 500 lines; any 400-line warning must have an accompanying tracking task for refactoring.
- Clean, acyclic dependency graph respecting architectural layer directions.
- Domain and application tests execute rapidly without booting FastAPI or external infrastructure.
- Every external I/O adapter includes integration or contract tests; critical user flows have E2E coverage.
- Module public APIs remain compact, well-typed, and hide infrastructure models.
- Architectural modifications are documented in ADRs; documentation and operational runbooks are updated alongside code changes.
