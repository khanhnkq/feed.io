# Feed.io Engineering Standards

## 1. Quy tắc bắt buộc

- Mọi file do đội dự án viết phải **không quá 500 dòng vật lý**, tính cả dòng trống và comment.
- CI cảnh báo khi file đạt **400 dòng**, thất bại khi file vượt **500 dòng**.
- Không được lách rule bằng tên như `service_part1.py`, `utils2.ts` hoặc chia file theo số thứ tự; phải tách theo trách nhiệm/nghiệp vụ.
- Ngoại lệ chỉ dành cho file máy sinh hoặc dữ liệu không chỉnh tay: `uv.lock`, `pnpm-lock.yaml`, Orval output, OpenAPI snapshot, minified/vendor code và binary fixtures. Danh sách ngoại lệ phải explicit trong script CI.
- Generated code nằm trong thư mục `generated/` và không chứa business logic.
- Một pull request không được thêm dependency cycle, cross-layer import hoặc import trực tiếp vào internal của module khác.

## 2. Ngưỡng khuyến nghị

| Thành phần | Mục tiêu | Giới hạn cứng |
|---|---:|---:|
| Function/method | 5–20 dòng | 40 dòng |
| Class | 50–150 dòng | 300 dòng |
| React component | 50–200 dòng | 300 dòng |
| Hook/use case | 30–120 dòng | 200 dòng |
| Router/controller | 50–150 dòng | 250 dòng |
| Source/test/config file | dưới 400 dòng | 500 dòng |

Khi gần ngưỡng, tách theo use case, component, policy, schema hoặc adapter. Không tách chỉ để giảm số dòng.

## 3. Cấu trúc monorepo chuẩn

```text
feed.io/
├── apps/
│   ├── backend/                    # Một Python package, nhiều entrypoint deploy
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
│       │   ├── app/                # Next.js routes/layouts, chỉ composition
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── organizations/
│       │   │   ├── projects/
│       │   │   ├── assets/
│       │   │   ├── upload/
│       │   │   ├── review/
│       │   │   ├── sharing/
│       │   │   └── notifications/
│       │   ├── components/ui/      # shadcn primitives, không business logic
│       │   ├── server/             # Auth.js, server-only clients, env
│       │   ├── shared/             # Chỉ code thật sự dùng từ >=2 module
│       │   └── styles/
│       ├── public/
│       └── tests/e2e/
├── packages/
│   ├── api-client/                 # Orval generated Axios client/hooks
│   ├── ui/                         # Design tokens/components dùng chung
│   ├── eslint-config/
│   └── typescript-config/
├── infra/
│   ├── compose/
│   │   ├── compose.base.yaml
│   │   ├── compose.dev.yaml
│   │   ├── compose.observability.yaml
│   │   └── compose.production.yaml
│   ├── nginx/
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

Không tạo `apps/api` và `apps/worker` thành hai bản sao backend. Chúng là hai process chạy từ cùng `apps/backend` package để dùng chung domain/application code.

## 4. Cấu trúc bắt buộc của backend module

Mỗi module nghiệp vụ có cùng shape, chỉ tạo folder khi có file thật:

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

### Dependency direction

```text
presentation ───────→ application ───────→ domain
infrastructure ─────→ application ports ─→ domain
bootstrap ──────────→ presentation + infrastructure
```

- `domain`: Python thuần; không import FastAPI, SQLModel, Celery hoặc boto3.
- `application`: orchestration/use cases; chỉ phụ thuộc domain và `Protocol` ports nhỏ.
- `infrastructure`: SQLModel, Argon2/JWT, Garage, RabbitMQ, Valkey, SMTP implementations.
- `presentation`: FastAPI router, request/response schema và auth dependencies; không chứa business rule.
- `bootstrap`: nơi duy nhất nối concrete adapter vào port.
- Module khác chỉ được import từ `modules/<name>/public.py`; không import internal layer.
- `shared/` không phải bãi chứa `utils`; code chỉ vào shared khi ít nhất hai module thực sự dùng và không mang nghĩa nghiệp vụ riêng.

## 5. Cấu trúc bắt buộc của frontend module

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

- `app/` chỉ đọc params, gọi module API và compose màn hình; route file không chứa business logic.
- Module chỉ export public API từ `index.ts`; không deep-import module khác.
- Server state dùng Orval/TanStack Query; local interaction state dùng Zustand; không copy server data vào Zustand.
- `components/ui` không import business module. Business component nằm trong module sở hữu nó.
- Axios chỉ được gọi trong `packages/api-client` hoặc module API adapter, không gọi trực tiếp trong React component.
- File có `'use client'` phải ở leaf thấp nhất có thể; server-only code không được import vào client bundle.

## 6. SOLID áp dụng thực tế

- **SRP:** một file/class/function có một lý do để thay đổi; router không xử lý transaction, repository không gửi email.
- **OCP:** thêm rendition strategy, notification channel hoặc share policy qua implementation mới, không sửa chuỗi `if/else` trung tâm.
- **LSP:** mọi adapter tuân thủ contract của port, cùng semantics lỗi/idempotency; test contract chạy cho fake và production adapter.
- **ISP:** ports nhỏ theo use case như `ObjectReader`, `ObjectWriter`, `MailSender`; không tạo `InfrastructureService` khổng lồ.
- **DIP:** application phụ thuộc `Protocol`; bootstrap inject `GarageStorage`, `StalwartMailer`, `PasswordManager`, `TokenManager`.
- Không tạo interface cho class nội bộ chỉ có một implementation nếu không nằm ở I/O boundary hoặc không cần test substitution.

## 7. Naming và file conventions

### Python

- File/module: `snake_case.py`; class: `PascalCase`; function/variable: `snake_case`; constant: `SCREAMING_SNAKE_CASE`.
- Commands dùng động từ: `create_project.py`; queries dùng `get_`, `list_`, `search_`.
- DTO/schema có suffix rõ ràng: `CreateProjectInput`, `ProjectView`, `ProjectTable`.
- Async function chỉ thêm `async` khi thật sự I/O; không đặt prefix `async_`.

### TypeScript/React

- File: `snake_case.ts`/`.tsx`; component/type: `PascalCase`; function/variable: `camelCase`; constant: `SCREAMING_SNAKE_CASE`.
- Hook bắt đầu bằng `use_` ở filename và `useX` ở symbol.
- Không dùng tên chung chung: `utils`, `helpers`, `common`, `manager`, `service` nếu có thể gọi đúng nghiệp vụ.
- Một React component chính mỗi file; component phụ nhỏ chỉ colocate khi không tái sử dụng và tổng file còn dưới ngưỡng.

## 8. Quality gates trong CI

1. `check-file-lines.sh` đếm dòng vật lý, warning `>=400`, exit non-zero `>500`.
2. Ruff + mypy kiểm backend; `import-linter` chặn dependency ngược/cross-module internal import.
3. ESLint `max-lines` + `eslint-plugin-boundaries`; `dependency-cruiser` chặn cycle và layer violation.
4. Unit/integration/contract tests chạy trước build image.
5. Orval regenerate và CI fail nếu generated output khác Git.
6. Docker/Compose config validation; secret scan; dependency/license audit.
7. Pull request checklist xác nhận file mới đúng module, không tạo `utils` hoặc abstraction chưa có use case.

## 9. Definition of Done

- Không file source do đội dự án viết vượt 500 dòng; không warning 400 dòng chưa có issue tách file.
- Dependency graph đúng chiều và không có cycle.
- Domain/application test không cần khởi động FastAPI hoặc hạ tầng.
- Mỗi I/O adapter có integration/contract test; critical path có E2E.
- Public API của module nhỏ, có owner và không làm lộ infrastructure model.
- Thay đổi kiến trúc quan trọng có ADR; docs/runbook được cập nhật cùng code.
