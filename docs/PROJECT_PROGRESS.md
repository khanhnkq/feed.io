# Báo cáo Tiến độ Phát triển Feed.io

*Cập nhật lần cuối: 14/09/2026*

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
| **Phase 6: Internal Review & Versioning** | Trình phát video SMPTE frame-accurate, timeline scrubber, comment theo timecode, vector annotations (brush, rect, circle, arrow, text), review decisions. *(Lưu ý: Luồng Media Versioning chưa làm)* | **Một phần** `[ ]` | Đã xong player, scrubber, comment timecode, annotations và review decisions. **Chưa làm luồng Versioning** (upload V2+, version stacking, version comparison). |
| **Phase 7: Collaboration & Alerts** | Real-time presence avatars qua WebSocket/Valkey, thông báo in-app và email, deep link điều hướng tự động nhảy đến đúng frame và mở comment. | **Hoàn thành** `[x]` | Đã chuẩn hóa logic tìm kiếm Organization theo cả UUID lẫn slug, khắc phục lỗi 404 từ link notification. |
| **Phase 8: External Share & Guest Review** | Tạo link chia sẻ bên ngoài độc lập, bảo vệ bằng passphrase, giới hạn ngày hết hạn, cấu hình quyền comment/approve/download, cổng review khách `/share/[token]`. | **Hoàn thành** `[x]` | Sửa lỗi 403 Garage S3 bằng Proxy MP4 direct streaming; đồng bộ giao diện khách 100% với workspace nội bộ. |
| **Phase 9: Design System & Storybook** | Hệ thống UI tokens (Neobrutalism), catalog Storybook bao phủ toàn bộ Primitives, Components, Review và Share dialogs. | **Hoàn thành** `[x]` | Đồng bộ nút Copy (với fallback URL) và nút Delete (`variant="danger"`) chuẩn Storybook và Design System. |
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
| **Frontend Unit Tests (Vitest)** | **144 / 144 tests passed** (39 test suites) | ĐẠT (100%) |
| **Backend Unit Tests (Pytest)** | **107 / 107 tests passed** | ĐẠT (100%) |
| **Static Type Checking (TypeScript)** | **0 errors** (`tsc --noEmit`) | ĐẠT (100%) |
| **Production Build (`next build`)** | Biên dịch thành công 100% tất cả static & dynamic routes | ĐẠT (100%) |
| **Giới hạn số dòng file vật lý** | **0 file > 500 dòng** (`scripts/check-file-lines.sh`) | ĐẠT (100%) |
| **Kiểm tra ranh giới kiến trúc** | Không vi phạm cycle import (`lint-imports`) | ĐẠT (100%) |

---

## 4. Hiện trạng & Kế hoạch hoàn thiện Media Versioning

> [!WARNING]
> **Media Versioning chưa hoàn thành trọn vẹn**. Hiện tại codebase mới chỉ có cấu trúc dữ liệu nền và giao diện chuyển đổi cơ bản; luồng nghiệp vụ tạo mới và xếp chồng phiên bản (Version Stacking) vẫn đang là tính năng dở dang cần triển khai tiếp.

### 4.1. Những phần ĐÃ CÓ (Foundational):
1. **Database Schema**: Bảng `media_assets` đã có cột `version_group_id` (UUID) và `version_number` (int, default=1), có index phục vụ truy vấn nhóm.
2. **Backend Read API**: Endpoint `GET /organizations/{org}/projects/{proj}/media/{media_id}/versions` cho phép lấy danh sách các media asset có cùng `version_group_id`.
3. **Frontend Switcher UI**: Component `<VersionSwitcher />` (`apps/web/src/modules/review/components/versions/version_switcher.tsx`) hiển thị danh sách V1, V2,... trong Review Workspace và cho phép click chuyển đổi qua lại giữa các phiên bản.

### 4.2. Những phần CHƯA CÓ & CẦN LÀM (Pending):
1. **Luồng Upload phiên bản mới (Upload V2+)**:
   - Hiện tại `UploadMediaDialog` và `PresignMediaUploadRequest` / `InitiateMultipartUploadRequest` chưa hỗ trợ tham số `parent_media_id` hoặc `version_group_id`. Mọi file upload lên đều tạo thành một media asset V1 độc lập.
   - Cần bổ sung action *"Upload new version"* trên menu ngữ cảnh của Media Card, Table Row, và trên Header của Review Workspace.
2. **Xếp chồng phiên bản thủ công (Version Stacking / Drag-and-Drop)**:
   - Hỗ trợ kéo thả một video đè lên một video khác trong Media Grid để gom chúng vào cùng một `version_group_id`.
   - Thao tác context menu: *"Stack as version with..."* hoặc *"Add to version group"*.
3. **Quản lý phiên bản (Version Management)**:
   - Tách một asset ra khỏi version stack (Unstack / Detach version).
   - Xóa một version cụ thể trong stack mà không ảnh hưởng các version khác.
   - Chọn version làm bản hiển thị mặc định (Set as primary).
4. **So sánh phiên bản (Side-by-Side / Split-Screen Comparison)**:
   - Trình phát đối chiếu 2 phiên bản (ví dụ V1 và V2) với playback đồng bộ frame-by-frame timecode để client/editor dễ dàng kiểm tra các điểm đã chỉnh sửa theo comment.

---

## 5. Kế hoạch triển khai tiếp theo (Next Steps)

1. **Triển khai Media Versioning toàn diện**:
   - Mở rộng API presign/multipart nhận `parent_media_id` hoặc `version_group_id`.
   - Thêm nút "Upload new version" trong Media Card, Table view và Review Header.
   - Cung cấp API và UI xếp chồng / tách phiên bản (Stack / Unstack versions).
2. **Kiểm thử E2E tích hợp (End-to-End Playwright)**:
   - Kịch bản luồng chính: Đăng ký/đăng nhập → Mời thành viên → Tạo dự án → Upload video → Tạo chú thích & bình luận frame → Duyệt review decision → Tạo link khách → Khách nghiệm thu video.
3. **Kiểm thử tải & Tối ưu hóa hiệu năng**:
   - Sử dụng k6 đo đạc hiệu năng streaming video đồng thời và tải tin nhắn WebSocket.
   - Thử nghiệm độ bền khi tắt/bật lại container Garage S3 hoặc Celery worker.
4. **Hoàn thiện Runbook Vận hành Self-Hosted**:
   - Hướng dẫn cấu hình chứng chỉ SSL tự động qua Caddy/Nginx.
   - Tài liệu quy trình backup định kỳ PostgreSQL (pgBackRest) và khôi phục dữ liệu từ xa.
