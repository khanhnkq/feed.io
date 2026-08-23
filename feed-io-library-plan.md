# Kế hoạch thư viện và dịch vụ self-hosted cho Feed.io

## Mục tiêu và ràng buộc

Giảm boilerplate nhưng không dùng managed cloud/SaaS. Mọi dịch vụ có trạng thái đều chạy trên máy chủ do đội dự án quản lý; code Feed.io tập trung vào media workflow, project authorization và review collaboration. Bản stable được khóa chính xác bằng `uv.lock`, `pnpm-lock.yaml` và image digest, không dùng tag `latest` trong production.

## Backend — FastAPI/Python

| Nhu cầu | Thư viện | Phần code được giảm |
|---|---|---|
| Package/runtime | `uv`, `fastapi[standard]`, `pydantic-settings` | Env, DI, validation, OpenAPI và server dev |
| ORM/schema | `sqlmodel`, `psycopg[binary,pool]`, `alembic` | Model lặp, pool PostgreSQL và migration |
| API utilities | `fastapi-pagination`, `orjson` | Pagination và serialization |
| Auth/JWT/password | `PyJWT[crypto]`, `pwdlib[argon2]` | JWT chuẩn, Argon2id hash/verify và kiểm expiry/type |
| Object storage | `boto3` | Presigned URL và S3 multipart với Garage |
| Background jobs | `celery`, `pyamqp` | RabbitMQ queue, retry/backoff và scheduling |
| Queue dashboard | `flower` | Theo dõi worker/task không cần tự viết admin UI |
| Realtime | `python-socketio`, `redis[hiredis]` client | Rooms, reconnect, ack và fan-out qua Valkey server |
| Email | `aiosmtplib`, `jinja2` | SMTP async và email templates |
| Logging/errors | `structlog`, `sentry-sdk[fastapi]` | JSON logs và gửi lỗi tới GlitchTip tự host |
| Metrics | `prometheus-fastapi-instrumentator` | HTTP latency/count/error metrics |
| Test | `pytest`, `pytest-asyncio`, `pytest-cov`, `testcontainers` | Async/integration test bằng service thật |
| Chất lượng | `ruff`, `mypy`, `import-linter`, `pre-commit` | Format, type-check và backend boundary rules |

**SQLModel:** vẫn tách `Table`, `Create`, `Update`, `Read`; dùng SQLAlchemy trực tiếp cho index/query/transaction nâng cao. Alembic là nguồn migration duy nhất, production không gọi `create_all()`.

**Identity tự quản lý:** FastAPI sở hữu register/verify/login/refresh/logout/recovery. PostgreSQL lưu Argon2id password hash và SHA-256 hash của refresh/action token; cookie access/refresh là HttpOnly. SMTP tự host gửi link một lần, reset password revoke toàn bộ session. MFA/SSO để sau MVP và phải có ADR riêng.

## Frontend — Next.js/TypeScript

| Nhu cầu | Thư viện | Phần code được giảm |
|---|---|---|
| Monorepo | `pnpm` workspaces + `turbo` | Script orchestration và build/test cache |
| UI | `shadcn/ui`, Tailwind CSS, `lucide-react`, `sonner` | Accessible primitives, icon và toast |
| Authentication | FastAPI + PostgreSQL sessions | SaaS form, HttpOnly token cookies, verify email, refresh rotation và revoke |
| Server state/API | `axios`, `@tanstack/react-query`, `orval` | HTTP client, cache và sinh types/Axios functions/hooks/MSW từ OpenAPI |
| Form | `react-hook-form`, `zod`, resolvers | Form state, field errors và client validation |
| Upload | `@uppy/core`, `@uppy/react`, `@uppy/aws-s3` | Multipart, progress, cancel và retry |
| Video player | `@vidstack/react`, `hls.js` | HLS, quality, caption, keyboard và player controls |
| Annotation | `react-konva`, `konva` | Canvas shapes, events và vector serialization |
| Local state/realtime | `zustand`, `socket.io-client` | Player/tool state, reconnect và room subscription |
| Table/utilities | `@tanstack/react-table`, `date-fns`, `nuqs` | Sort/filter và URL/date state |
| Error monitoring | `@sentry/nextjs` | Gửi frontend error/source map tới GlitchTip tự host |
| Test/architecture | `vitest`, Testing Library, `msw`, `playwright`, `eslint-plugin-boundaries`, `dependency-cruiser` | Test, cycle và frontend boundary rules |

```text
SQLModel/Pydantic → FastAPI openapi.json → Orval
                  → TypeScript types + Axios client + React Query hooks + MSW mocks
```

Không viết thủ công API interface hoặc query hook. Orval dùng một Axios instance chung có `baseURL`, timeout, auth header, request ID và chuẩn hóa lỗi. Chỉ adapter/generated client được import Axios trực tiếp; component gọi React Query hooks. Zod thủ công chỉ phục vụ UX; validation nghiệp vụ nằm ở FastAPI.

**Quy tắc Axios:** cấu hình Orval với `httpClient: 'axios'` và custom mutator. Axios bật `withCredentials`, đọc duy nhất CSRF cookie để gắn `X-CSRF-Token` và không bao giờ đọc access/refresh token. Interceptor response gom nhiều lỗi 401 về một request refresh rồi retry mỗi request tối đa một lần. FastAPI sở hữu toàn bộ cookie lifecycle, phát hành, rotation và revoke token.

## Dịch vụ phải tự host

| Trách nhiệm | Chọn | Cách triển khai |
|---|---|---|
| Reverse proxy/TLS/cache | Nginx | TLS termination, routing, rate limit thô và `proxy_cache` cho HLS |
| Database | PostgreSQL | Một cluster, database/user tách riêng cho Feed.io và GlitchTip |
| Identity | Feed.io API | Argon2id, JWT, hashed sessions/action tokens trong PostgreSQL |
| Object storage | Garage | S3-compatible; 1 node local, 3 node/3 zone production |
| Job broker | RabbitMQ | Celery queues, publisher confirms, DLQ và management UI |
| Cache/realtime/rate limit | Valkey | Socket.IO Pub/Sub, token bucket và cache ngắn hạn |
| Email dev | Mailpit | Bắt email local, không gửi ra Internet |
| Email production | Stalwart Mail Server | SMTP submission, DKIM/SPF/DMARC và queue do mình vận hành |
| Error tracking | GlitchTip | Docker Compose; nhận event từ Sentry-compatible SDK |
| Metrics/logs | Prometheus + Grafana + Loki + Alloy | Dashboard/alert, logs container; monolithic mode ban đầu |
| Source/CI/registry | Forgejo + Forgejo Runner | Git, Actions và OCI/package registry tự host |
| Secrets | SOPS + age | Secret mã hóa trong Git; private key chỉ ở deploy host |
| Backup | pgBackRest + restic + rclone | PostgreSQL PITR, config/volume và media copy sang máy thứ hai |

Garage được chọn vì hỗ trợ presigned URL và đầy đủ multipart endpoints cần cho Uppy. Feed.io tự quản lý version trong PostgreSQL nên không phụ thuộc S3 bucket versioning. Production không chạy Garage một node vì không có redundancy.

## Luồng dịch vụ

- **Đăng nhập:** Browser → FastAPI credentials → Argon2id verify → hashed PostgreSQL session → HttpOnly cookies → Feed.io RBAC.
- **Upload:** Uppy → FastAPI ký request bằng boto3 → browser upload trực tiếp Garage → Nginx chỉ phục vụ download/HLS cache.
- **Transcode:** FastAPI/outbox → Celery/RabbitMQ → FFmpeg worker → Garage → event qua Valkey/Socket.IO.
- **Notification:** Celery → Jinja template → SMTP Stalwart; Mailpit thay Stalwart ở local.
- **Quan sát:** app log JSON → Alloy/Loki; metrics → Prometheus/Grafana; exception → GlitchTip.
- **Release:** Forgejo Runner test/build → OCI image vào Forgejo Registry → deploy host pull theo immutable digest.

## Những thứ không thêm

- Không Clerk/Auth0, Resend/SendGrid, Sentry Cloud, AWS S3/CloudFront, Upstash, Vercel, GitHub Actions hoặc managed PostgreSQL.
- Không Redux, GraphQL/tRPC, `ffmpeg-python`, react-dropzone hoặc Video.js.
- Không Kafka, Elasticsearch hoặc Kubernetes ở quy mô dưới 1.000 user.
- Không tự viết password hashing, MFA, SMTP server, S3 protocol, video player hoặc error dashboard; dùng phần mềm open-source tự host.
- Không bọc FastAPI/SQLModel/React/TanStack Query bằng abstraction riêng; chỉ đặt adapter nhỏ quanh password/JWT, Garage, SMTP và GlitchTip.
- Mọi source file do đội dự án viết tối đa 500 dòng; CI cảnh báo từ 400 dòng theo [Engineering Standards](./feed-io-engineering-standards.md).

## Kế hoạch áp dụng

- [ ] **1. Dependency lock:** tạo `pyproject.toml`, `uv.lock`, pnpm workspace, image manifest và CI line/boundary checks. → **Verify:** build offline không đổi lockfile; file >500 dòng, cycle hoặc dependency sai layer làm CI fail.
- [ ] **2. Core data:** FastAPI + SQLModel + PostgreSQL + Alembic; tách DB/user cho app và infra. → **Verify:** migration upgrade/downgrade và connection isolation chạy đúng.
- [x] **3. Identity:** dựng first-party register/verify/login/recovery/session flows; còn Valkey rate limiting, MFA và production hardening. → **Verify:** verify bắt buộc, refresh rotate/reuse detection, reset revoke mọi session và JWT sai type bị chặn.
- [ ] **4. Contract/UI:** Axios instance + Orval Axios mutator + TanStack Query + shadcn/form stack. → **Verify:** đổi OpenAPI khiến frontend type-check phát hiện; 401/422/500 được chuẩn hóa đúng.
- [ ] **5. Media:** Garage + Uppy/boto3 + RabbitMQ/Celery/Flower + Vidstack/FFmpeg. → **Verify:** multipart retry → transcode → HLS cache → playback hoàn tất.
- [ ] **6. Collaboration:** Valkey + Socket.IO + Konva/Zustand. → **Verify:** hai browser đồng bộ; reconnect không nhân event.
- [ ] **7. Platform:** Stalwart/Mailpit, GlitchTip, Prometheus/Grafana/Loki/Alloy và Forgejo Runner. → **Verify:** email, error, dashboard, CI và registry hoạt động khi ngắt mọi SaaS credential.
- [ ] **8. Recovery:** pgBackRest/restic, restore drill và failover Garage node. → **Verify:** dựng môi trường sạch từ backup và không mất object đã xác nhận.

## Rủi ro vận hành chấp nhận

- Self-host giảm vendor lock-in nhưng tăng patching, monitoring, backup và on-call; mỗi service phải có owner/runbook.
- Gửi email Internet cần IP có reputation, PTR/rDNS và DNS SPF/DKIM/DMARC; Stalwart không tự giải quyết reputation hoặc việc ISP chặn port 25.
- Nginx cache là edge cache một/vài location, không phải CDN toàn cầu; chỉ thêm node vùng khác khi latency thực tế yêu cầu.
- Một PostgreSQL cluster là điểm lỗi chung; MVP dùng backup/PITR, sau đó mới thêm replica/failover.
- Production tối thiểu nên có ba storage nodes hoặc hai máy chủ + một backup host vật lý khác; backup không đặt chung failure domain.

## Hoàn thành khi

- Feed.io chạy được mà không có API key hoặc tài khoản ở bất kỳ managed cloud/SaaS nào.
- Tắt Internet sau khi image/dependency đã mirror vẫn dùng được login nội bộ, upload, transcode và review; email ra ngoài được loại khỏi tiêu chí air-gap.
- Critical path có integration/E2E test và build tái lập từ registry/lockfile nội bộ.
- PostgreSQL và media restore thành công từ bản backup trên host khác.

## Tài liệu chính thức

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Axios instances](https://axios-http.com/docs/instance)
- [Orval custom Axios](https://orval.dev/docs/guides/custom-axios/)
- [Garage quick start](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
- [Garage S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
- [Valkey](https://valkey.io/docs/)
- [Stalwart Docker](https://stalw.art/docs/install/platform/docker/)
- [GlitchTip self-hosting](https://glitchtip.com/documentation/install/)
- [Grafana Loki install](https://grafana.com/docs/loki/latest/setup/install/)
- [Forgejo Actions](https://forgejo.org/docs/latest/user/actions/overview/)
