# Kế Hoạch Thiết Kế Hệ Thống Skeleton Loading Toàn Diện Cho Feedio

## Mục Tiêu
Thay thế toàn bộ các spinner chờ (`Loader2` xoay vòng giữa màn hình trắng) bằng hệ thống **Skeleton Loading Components** chuẩn mực, có hiệu ứng pulse/shimmer hài hòa theo Design System của Feedio (`paper`, `surface`, `line`), loại bỏ hoàn toàn hiện tượng giật layout (Cumulative Layout Shift - CLS) khi đợi response từ Backend.

---

## Danh Sách Nhiệm Vụ (Tasks)

### Giai Đoạn 1: Xây Dựng UI Primitive `<Skeleton />` Dùng Chung
- [x] **Task 1.1**: Tạo primitive component `apps/web/src/modules/ui/components/skeleton.tsx` hỗ trợ các biến thể (`rounded-md`, `rounded-full`, text line, custom dimensions) với hiệu ứng shimmer mượt mà trên nền `--color-line` (`#dedfd8`).
  - *Verify*: Viết unit test `skeleton.test.tsx` kiểm tra render class và accessibility (`aria-hidden="true"`, `aria-busy="true"`).
- [x] **Task 1.2**: Export `Skeleton` trong `apps/web/src/modules/ui/index.ts`.

---

### Giai Đoạn 2: Skeleton Cho Module Admin & System Overview (`/app/admin`)
- [x] **Task 2.1**: Thiết kế `AdminOverviewSkeleton`:
  - 4 Metric cards hàng ngang (Total Users, Orgs, Storage Used, Active Subscriptions).
  - Storage breakdown progress bar & Service health status table (Postgres, Redis, RabbitMQ, Garage S3).
- [x] **Task 2.2**: Thiết kế `AdminTableSkeleton` cho 3 tab còn lại:
  - Users Tab (search input + role/status filter chips + table với avatar & badge).
  - Organizations Tab (search + table danh sách org kèm storage quota bars).
  - Audit Logs Tab (timeline table với timestamp & actor).
- [x] **Task 2.3**: Tích hợp vào `apps/web/src/modules/admin/components/admin_screen.tsx`, thay thế các block `Loader2 size={28}` và auth loading spinner.
  - *Verify*: Mở `/app/admin` với simulated slow network, giao diện hiển thị khung dashboard hoàn chỉnh ngay lập tức.

---

### Giai Đoạn 3: Skeleton Cho Workspace Dự Án & Media Grid
- [x] **Task 3.1**: Chuẩn hóa `ProjectCollectionSkeleton` và tạo `MediaGridSkeleton`:
  - Grid card media (tỉ lệ 16:9 thumbnail preview, badge trạng thái transcoding, file name, duration tag).
  - List view mode skeleton (hàng ngang thông tin chi tiết file).
- [x] **Task 3.2**: Tạo `KanbanBoardSkeleton` cho route `/kanban`:
  - 3-4 cột trạng thái (In Progress, Needs Review, Approved) với các card media giả lập.
- [x] **Task 3.3**: Tạo `ProjectHeaderSkeleton` (breadcrumb, project title, member avatar stack, upload/invite buttons).
  - *Verify*: Tích hợp vào `apps/web/src/app/(app)/app/organizations/[slug]/projects/[projectId]/page.tsx` và `/kanban/page.tsx`.

---

### Giai Đoạn 4: Skeleton Cho Media Player & Review Workspace (`/media/[mediaId]`)
- [x] **Task 4.1**: Thiết kế `MediaReviewSkeleton`:
  - **Khu vực Canvas chính**: Khung player 16:9 với timeline/playhead placeholder bên dưới.
  - **Thanh công cụ Top Bar**: Version dropdown, status indicator, action buttons (Share, Download, Approval).
  - **Cột phải (Review Drawer)**: Header tab Comments/Activity, danh sách comment card có avatar, timestamp, timecode badge và ô nhập feedback.
- [x] **Task 4.2**: Thay thế spinner `<Loader2 className="size-8 animate-spin text-ink" />` trong `media/[mediaId]/page.tsx`.
  - *Verify*: Truy cập media trực tiếp, khung player và sidebar comment xuất hiện ngay trước khi video/metadata load xong.

---

### Giai Đoạn 5: Skeleton Cho Billing, Profile & Notifications
- [x] **Task 5.1**: Thiết kế `BillingSkeleton` (`apps/web/src/modules/billing/components/billing_skeleton.tsx`):
  - Banner gói cước hiện tại (Pro/Enterprise, nút đổi gói).
  - Card dung lượng lưu trữ (Storage meter bar).
  - Bảng lịch sử hóa đơn & phương thức thanh toán.
  - Tích hợp vào `/app/organizations/[slug]/billing` và `/app/settings/billing`.
- [x] **Task 5.2**: Thiết kế `ProfileSettingsSkeleton`:
  - Avatar uploader circle placeholder.
  - Các input field (Full name, Email, Security sessions table).
- [x] **Task 5.3**: Thiết kế `NotificationListSkeleton` trong `NotificationPopover`:
  - Danh sách 4 item thông báo gồm icon chuông/event + 2 dòng nội dung.
  - *Verify*: Click icon thông báo khi mạng chậm thấy ngay khung list.

---

### Giai Đoạn 6: Tích Hợp Next.js App Router Route-Level `loading.tsx`
- [x] **Task 6.1**: Tạo các file `loading.tsx` tại các route phân tầng để tận dụng React Server Components & Streaming Suspense:
  - `apps/web/src/app/(app)/app/admin/loading.tsx`
  - `apps/web/src/app/(app)/app/loading.tsx`
  - `apps/web/src/app/(app)/app/organizations/[slug]/projects/loading.tsx`
  - `apps/web/src/app/(app)/app/organizations/[slug]/projects/[projectId]/loading.tsx`
  - `apps/web/src/app/(app)/app/organizations/[slug]/projects/[projectId]/media/[mediaId]/loading.tsx`
  - `apps/web/src/app/(app)/app/organizations/[slug]/billing/loading.tsx`
  - `apps/web/src/app/(app)/app/settings/loading.tsx`
  - *Verify*: Điều hướng giữa các trang (Client-side Navigation) chuyển cảnh tức thì với skeleton layout mà không có màn hình trắng.

---

### Giai Đoạn 7: Kiểm Thử & Tối Ưu UX/Accessibility (Verification)
- [x] **Task 7.1**: Chạy kiểm tra TypeScript và Build toàn bộ frontend:
  - Lệnh: `pnpm --filter @feedio/web build`
- [x] **Task 7.2**: Chạy Unit Tests UI:
  - Lệnh: `pnpm --filter @feedio/web test` (223 passed)
- [x] **Task 7.3**: Đảm bảo tuân thủ Accessibility:
  - Mọi skeleton container đều có `aria-busy="true"` và `aria-label="Đang tải dữ liệu..."`.
  - Các element con bên trong đánh dấu `aria-hidden="true"`.
- [x] **Task 7.4**: Kiểm tra Responsive & Dark/Light theme:
  - Màu sắc shimmer hòa hợp với nền `--color-paper` (`#f3f3ed`) và `--color-surface` (`#fbfbf7`).

---

## Tiêu Chí Hoàn Thành (Done When)
- [x] Không còn bất kỳ spinner `Loader2` đơn độc nào chiếm toàn màn hình khi load trang hoặc chuyển tab.
- [x] Tất cả các trang cốt lõi (`Admin`, `Projects`, `Media Review`, `Billing`, `Settings`) đều có skeleton phản chiếu chính xác 1:1 bố cục thực tế của dữ liệu.
- [x] Layout không bị nhảy/giật (Zero CLS) khi dữ liệu API từ Backend đổ về.
- [x] Build Next.js thành công 100% không có lỗi type hay lint.
