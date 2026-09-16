# Báo cáo Tiến độ Phát triển Feed.io

*Cập nhật lần cuối: 16/09/2026*

Dự án **Feed.io** (Nền tảng Video Review & Approval tự host cho Agency/Studio sáng tạo) đã hoàn thành toàn bộ các module nghiệp vụ cốt lõi của **MVP (Minimum Viable Product)** trên cả 3 tầng: **Backend (FastAPI/Celery)**, **Frontend (Next.js/Design System)** và **Hạ tầng (Docker/Garage S3)**.

---

## 1. Bảng Trạng thái 10 Giai đoạn Phát triển

| Giai đoạn | Mô tả nghiệp vụ & Kỹ thuật | Trạng thái | Ghi chú & Kết quả |
| :--- | :--- | :---: | :--- |
| **Phase 1: Foundation & Infra** | Monorepo pnpm/turbo, Docker Compose (PostgreSQL, Valkey, RabbitMQ, Garage S3, Mailpit, GlitchTip, Nginx), CI scripts kiểm tra < 500 dòng và module boundaries. | **Hoàn thành** `[x]` | Khởi động toàn bộ platform qua 1 lệnh `make stack-up`. CI tự động chặn cycle import và file vượt ngưỡng. |
| **Phase 2: Identity & Tenancy** | Đăng ký, bắt buộc verify email, đăng nhập, JWT + HttpOnly CSRF cookie, refresh token rotation, thu hồi phiên làm việc, cô lập tenant triệt để giữa các Organization. | **Hoàn thành** `[x]` | Mật khẩu băm bằng Argon2id. Kiểm thử chéo tenant ngăn chặn triệt để rò rỉ dữ liệu giữa các tổ chức. |
| **Phase 3: Workspace & Projects** | Quản lý Project, Folder phân cấp (chống vòng lặp), Project Privacy (private/public), phân quyền thành viên (`Members`), các chế độ hiển thị Grid / Table / Kanban. | **Hoàn thành** `[x]` | Đồng bộ toàn diện thuật ngữ từ `team` sang `members` (`/app/organizations/[slug]/members`). |
| **Phase 4: Upload Pipeline** | Presigned Multipart Upload trực tiếp lên Garage S3 qua client-side chunking, tự động retry, hủy upload, tính checksum, thanh tiến trình toast. | **Hoàn thành** `[x]` | Video dung lượng lớn được tải thẳng lên S3 không đi qua API, không gây nghẽn tiến trình API chính. |
| **Phase 5: Media Processing** | Celery worker bất đồng bộ, dùng ffprobe trích xuất metadata và FFmpeg tạo Master HLS adaptive, Proxy MP4, Thumbnail và Filmstrip sprite. | **Hoàn thành** `[x]` | Tạo file rendition tối ưu cho streaming và scrubber trên trình duyệt với cơ chế xử lý lỗi an toàn. |
| **Phase 6: Internal Review & Versioning (Phase 8B)** | Trình phát SMPTE frame-accurate, timeline scrubber, comment timecode, vector annotations, review decisions, Video Version Stacking, Drag & Drop stack, Upload V2+, và Synchronized Dual Comparison (Side-by-side, Wipe slider, Difference). | **Hoàn thành** `[x]` | Hoàn tất 100% backend commands, repository mixin, versions router và frontend dual player engine, modal quản lý stack, interactive Storybook. |
| **Phase 7: Collaboration & Alerts** | Real-time presence avatars qua WebSocket/Valkey, thông báo in-app và email, deep link điều hướng tự động nhảy đến đúng frame và mở comment. | **Hoàn thành** `[x]` | Đã chuẩn hóa logic tìm kiếm Organization theo cả UUID lẫn slug, khắc phục lỗi 404 từ link notification. |
| **Phase 8: External Share & Guest Review** | Tạo link chia sẻ bên ngoài độc lập, bảo vệ bằng passphrase, giới hạn ngày hết hạn, cấu hình quyền comment/approve/download, cổng review khách `/share/[token]`. | **Hoàn thành** `[x]` | Sửa lỗi 403 Garage S3 bằng Proxy MP4 direct streaming; đồng bộ giao diện khách 100% với workspace nội bộ. |
| **Phase 9: Design System & Storybook** | Hệ thống UI tokens (Neobrutalism), catalog Storybook bao phủ toàn bộ Primitives, Components, Review, Share dialogs và Versioning interactive gallery. | **Hoàn thành** `[x]` | Hoàn thành storybook components, build tĩnh thành công 100%, đồng bộ toàn bộ nhãn tiếng Anh chuẩn thiết kế. |
| **Phase 10: Self-Host Platform & Hardening** | Nginx reverse proxy với HTTPS, GlitchTip error tracking, Prometheus/Grafana metrics, sao lưu dữ liệu tự động và kịch bản phục hồi. | *Đang chuẩn bị* `[ ]` | Chuẩn bị chạy kịch bản load test k6 và diễn tập khôi phục thảm họa (backup/restore drill). |

---

## 2. Chi tiết các Cải tiến & Sửa lỗi quan trọng gần đây

### 2.1. Khắc phục lỗi phát video khách (403 Forbidden)
- **Vấn đề**: Khi khách truy cập link chia sẻ ngoài, video không phát được và trả về `403 Forbidden` từ Garage S3.
- **Nguyên nhân**: API ưu tiên phát playlist HLS (`master.m3u8`), các file phân đoạn `.ts` con bên trong không mang chữ ký AWS Signature trong môi trường private bucket của Garage S3.
- **Giải pháp**:
  - API `get_public_share_stream` cấp presigned URL cho Proxy MP4 và source MP4 trực tiếp kèm header `Accept-Ranges` / `Content-Range`.
  - Cấu hình lại S3 CORS expose đầy đủ header phục vụ HTTP 206 Partial Content.
  - VideoPlayer ưu tiên đọc direct Proxy MP4 trên trình duyệt khách.

### 2.2. Khắc phục lỗi điều hướng thông báo (404 Not Found)
- **Vấn đề**: Bấm vào liên kết trong chuông thông báo dẫn tới trang 404 "Organization not found".
- **Nguyên nhân**: Link thông báo lưu UUID của organization (`/app/organizations/{uuid}/...`) trong khi router Next.js dùng `[slug]` và truy vấn API `get_by_slug` vốn chỉ tìm theo text slug.
- **Giải pháp**:
  - Cập nhật repository backend để `get_by_slug` tìm kiếm linh hoạt theo cả `slug` và `id` (nếu chuỗi truyền vào là UUID hợp lệ).
  - Thêm middleware chuẩn hóa URL tự động điều hướng từ UUID sang slug chuẩn trên Next.js.
  - Tự động nhảy timecode và highlight comment khi URL chứa query param `?commentId=...`.

### 2.3. Chuẩn hóa Context & Thuật ngữ toàn diện (`team` → `members`)
- **Vấn đề**: Giao diện dùng lẫn lộn giữa "Team", "Agency", "Workspace" và "Members", gây lệch pha với domain backend.
- **Giải pháp**:
  - Chuẩn hóa toàn bộ route canonical thành `/app/organizations/[slug]/members`.
  - Thêm backward-compatible redirect tự động cho `/team` và `/member`.
  - Cập nhật backend notification payload trỏ về `/members`.
  - Đồng bộ màu nền `bg-white` cho table view theo đúng thiết kế.

### 2.4. Khôi phục nút Copy & Chuẩn hóa nút Delete trong Guest Share Links
- **Nút Copy**:
  - Khắc phục lỗi nút Copy bị ẩn do API trả về `share_url = null`.
  - Bổ sung fallback URL `/share/${link.id}` và hỗ trợ backend phân giải link theo cả `token_hash` lẫn UUID `link.id`.
  - Hiển thị phản hồi "Copied" kèm icon check khi sao chép.
- **Nút Delete**:
  - Thay thế nút cũ (`variant="ghost"`, màu xám, hover màu đen) sang `variant="danger"` chuẩn Design System Feed.io (nền đỏ neobrutalist, viền đỏ, hiệu ứng đổ bóng đặc trưng).
  - Tích hợp icon `<Trash2 size={12} />` cùng nhãn chữ `<span className="text-[11px]">Delete</span>`.

---

## 3. Chỉ số Kiểm thử & Đảm bảo Chất lượng (QA Metrics)

| Tiêu chí | Kết quả | Trạng thái |
| :--- | :---: | :---: |
| **Frontend Unit Tests (Vitest)** | **158 / 158 tests passed** (40 test suites) | ĐẠT (100%) |
| **Backend Unit Tests (Pytest)** | **113 / 113 tests passed** | ĐẠT (100%) |
| **Static Type Checking (TypeScript)** | **0 errors** (`tsc --noEmit`) | ĐẠT (100%) |
| **Production Build (`next build`)** | Biên dịch thành công 100% tất cả static & dynamic routes | ĐẠT (100%) |
| **Storybook Build (`storybook build`)** | Biên dịch tĩnh thành công 100% catalog UI & Versioning | ĐẠT (100%) |
| **Giới hạn số dòng file vật lý** | **0 file > 500 dòng** (`scripts/check-file-lines.sh`) | ĐẠT (100%) |
| **Kiểm tra ranh giới kiến trúc** | Không vi phạm cycle import (`lint-imports` - 4 contracts kept) | ĐẠT (100%) |

---

## 4. Chi tiết Hoàn thiện Module Video Versioning & Comparison (Phase 8B)

Toàn bộ kế hoạch **Phase 8B: Video Version Stacking & Side-by-Side Comparison** đã được hiện thực hóa trọn vẹn:

### 4.1. Tầng Cơ sở dữ liệu & Tối ưu Toàn vẹn (DB Integrity)
- **Migration `0017`**:
  - Thêm `updated_at`, `deleted_at` (soft-delete) cho `projects` kèm partial index `ix_projects_org_active`.
  - Thiết lập Foreign Keys `CASCADE` cho `media_comments` và `notifications`.
  - Hỗ trợ Guest Reviewer trong `media_review_decisions` (`user_id` nullable, `guest_name`, XOR check constraint).
  - Ràng buộc XOR check constraint cho `share_links` (`media_id` XOR `folder_id`).
  - Tạo bảng Transactional Outbox `outbox_events` (`OutboxEventTable`).
- **Migration `0018`**:
  - Bổ sung `version_label` (VARCHAR 100) và `is_primary_version` (BOOLEAN, default TRUE) vào `media_assets`.
  - Tạo partial index `ix_media_assets_version_group_number` và `ix_media_assets_primary_version`.

### 4.2. Tầng Backend Commands & API Routers
- **Application Commands**:
  - `StackMedia`: Gộp 2 asset thành một stack (`target_media_id` + `source_media_id`), tự động sinh `version_group_id` và đánh số `version_number`.
  - `UnstackMedia`: Tách asset con ra khỏi stack thành media độc lập V1.
  - `SetPrimaryVersion`: Chỉ định version đại diện hiển thị cho stack.
  - `UpdateVersionLabel`: Cập nhật nhãn phiên bản tùy chỉnh (ví dụ: *Rough Cut*, *Color Graded*).
- **Repository Mixin**:
  - `VersionRepositoryMixin` (`version_repository.py`): Tách biệt logic quản lý phiên bản với transaction an toàn, bảo vệ file `repository.py` luôn < 500 dòng.
- **REST Endpoints (`versions_router.py`)**:
  - `POST /{media_id}/versions/presign-upload`: Khởi tạo tải version mới trực tiếp.
  - `POST /{media_id}/versions/complete`: Hoàn tất tải version mới và tự động đánh số phiên bản.
  - `POST /stack`: Gộp 2 video riêng lẻ vào stack.
  - `POST /{media_id}/unstack`: Tách video khỏi stack.
  - `POST /{media_id}/set-primary`: Đặt làm phiên bản hiển thị chính.
  - `PATCH /{media_id}/version-label`: Cập nhật nhãn phiên bản.
  - `GET /{media_id}/versions`: Lấy danh sách đầy đủ tất cả phiên bản trong group.

### 4.3. Tầng Frontend UI & Version Stacking Experience
- **Project Grid (`media_card.tsx`)**:
  - Hiệu ứng thị giác thẻ xếp chồng (**Stacked Card visual layer**) khi `version_count > 1`.
  - Badge nổi bật hiển thị phiên bản hiện tại và tổng số version (`V3 (3 versions)`).
  - Kéo thả HTML5 Drag and Drop giữa các card để kích hoạt gộp phiên bản.
  - Hộp thoại xác nhận an toàn `StackConfirmDialog` hiển thị thumbnail 2 bản và cho phép đặt nhãn version.
  - Hộp thoại quản lý `VersionStackDialog`: Đặt primary, unstack, đổi nhãn, và nút mở thẳng upload version mới.
- **Review Workspace Header (`version_switcher.tsx`)**:
  - Thêm nút (+) tải version mới trực tiếp từ thanh công cụ review.
  - Nút "Compare with..." khởi chạy chế độ so sánh video tức thì.
  - Dialog tải version mới độc lập `UploadVersionDialog`.

### 4.4. Trình phát So sánh Phiên bản Đồng bộ (Synchronized Dual Playback)
- **Động cơ Đồng bộ Master Clock (`use_synchronized_playback.ts`)**:
  - Điều khiển 2 luồng video song song với độ trễ < 0.04s (frame-accurate).
  - Tự động bù trôi (drift correction) và hỗ trợ tinh chỉnh lệch khung hình (*Frame Offset Alignment*).
- **3 Chế độ So sánh Trực quan (`version_compare_workspace.tsx`)**:
  1. **Side-by-Side (50/50)**: Hai video hiển thị song song, tự động thích ứng khung hình.
  2. **Split-Screen Wipe Slider**: Khung hình đơn với rèm trượt dọc kéo rê qua lại soi từng pixel thay đổi (`clip-path`).
  3. **Difference Overlay Mode**: Pha trộn lớp CSS `mix-blend-mode: difference;` làm nổi bật các điểm khác biệt.
- **Audio Routing**:
  - Chuyển đổi mượt mà giữa Audio A (Version A) và Audio B (Version B).

---

## 5. Kế hoạch triển khai tiếp theo (Next Steps)

1. **Kiểm thử E2E tích hợp (End-to-End Playwright)**:
   - Kịch bản luồng chính: Đăng ký/đăng nhập → Mời thành viên → Tạo dự án → Upload video V1 → Tạo version V2/V3 (qua upload & drag-drop stack) → Mở Review so sánh Dual Player (Wipe slider / Side-by-side) → Duyệt decision → Tạo link khách → Khách nghiệm thu video.
2. **Kiểm thử tải & Tối ưu hóa hiệu năng**:
   - Sử dụng k6 đo đạc hiệu năng streaming video đồng thời và tải tin nhắn WebSocket.
   - Thử nghiệm độ bền khi tắt/bật lại container Garage S3 hoặc Celery worker.
3. **Hoàn thiện Runbook Vận hành Self-Hosted (Phase 10)**:
   - Hướng dẫn cấu hình chứng chỉ SSL tự động qua Caddy/Nginx.
   - Tài liệu quy trình backup định kỳ PostgreSQL (pgBackRest) và khôi phục dữ liệu từ xa.
