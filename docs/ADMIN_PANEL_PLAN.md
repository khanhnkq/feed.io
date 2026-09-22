# Kế hoạch Tích hợp Platform Admin Panel cho Feed.io

Tài liệu này đặc tả toàn diện kiến trúc, giao diện người dùng, hệ thống component tái sử dụng, token màu sắc và các storybook stories cho **Platform Admin Panel** của Feed.io.

---

## 1. Mục tiêu & Phạm vi (Objectives & Scope)

1. **Quản trị toàn diện nền tảng (Platform Administration):**
   - Hỗ trợ vai trò quản trị viên cấp cao (`platform_role = 'super_admin'`) và đội ngũ hỗ trợ kỹ thuật (`platform_role = 'support'`).
   - Cung cấp 4 phân hệ chính:
     - **Overview / Metrics:** Giám sát sức khỏe hạ tầng (Postgres, Valkey, RabbitMQ, S3 Garage, Rate Limiter) & KPI hệ thống.
     - **Users Management:** Quản lý người dùng, phân quyền vai trò nền tảng (`user`, `support`, `super_admin`), khóa / mở khóa tài khoản.
     - **Organizations & Workspaces:** Quản trị các tổ chức, hạn mức lưu trữ (storage quota), gói dịch vụ.
     - **Audit Logs & Security:** Lịch sử các thao tác nhạy cảm, sự kiện bảo mật, lưu lượng Rate Limit.

2. **Tuân thủ quy chuẩn thiết kế & Codebase (Strict Design Standards):**
   - **Tái sử dụng 100% Shared UI Components** tại `@/modules/ui`: `Card`, `Table`, `Badge`, `Button`, `Tabs`, `Dialog`, `Dropdown`, `FilterToolbar`, `ProgressBar`, `Avatar`, `Tooltip`. Tuyệt đối không code lại component đã có!
   - **Chuẩn Design Token màu sắc:** `@theme` Tailwind v4:
     - Nền: `bg-paper` (`#f3f3ed`), `bg-surface` (`#fbfbf7`).
     - Chữ: `text-ink` (`#11130f`), `text-muted` (`#73766d`).
     - Viền: `border-line` (`#dedfd8`).
     - Điểm nhấn & Trạng thái: `bg-lime` (`#d8ff43`), `text-orange` (`#ff9d62`), `text-cyan` (`#81dce2`), `text-lilac` (`#c9c6ff`).
   - **Kiểm thử trực quan trên Storybook:** Thêm đầy đủ `*.stories.tsx` cho từng tab và toàn bộ màn hình Admin Panel với nhiều kịch bản (Super Admin, Support, High Load, Empty State, Dialogs).

---

## 2. Kiến trúc Module (`apps/web/src/modules/admin/`)

```
apps/web/src/modules/admin/
├── types.ts                                # Kiểu dữ liệu TypeScript cho Admin domain
├── lib/
│   └── mock_data.ts                        # Dữ liệu mẫu phong phú cho Storybook & development
├── components/
│   ├── admin_screen.tsx                    # Shell chính: Header, Navigation Tabs, Access Control Guard
│   ├── overview_tab.tsx                    # Tab KPI & Tình trạng hạ tầng hệ thống
│   ├── users_tab.tsx                       # Tab Quản lý người dùng, phân quyền, trạng thái
│   ├── organizations_tab.tsx               # Tab Quản trị Tổ chức & Hạn mức lưu trữ
│   ├── audit_logs_tab.tsx                  # Tab Lịch sử thao tác & Audit Log bảo mật
│   ├── admin_screen.stories.tsx            # Storybook cho toàn bộ Admin Screen
│   ├── overview_tab.stories.tsx            # Storybook cho Overview Tab
│   ├── users_tab.stories.tsx               # Storybook cho Users Tab & Dialogs
│   ├── organizations_tab.stories.tsx       # Storybook cho Organizations Tab
│   ├── audit_logs_tab.stories.tsx          # Storybook cho Audit Logs Tab
│   └── admin_screen.test.tsx               # Unit tests kiểm tra render, guard & interactions
└── index.ts                                # Entrypoint xuất bản module
```

---

## 3. Bản đồ Tái sử dụng UI Components (Component Reuse Map)

| UI Khung Quản Trị | Shared Component từ `@/modules/ui` | Mục đích sử dụng | Token màu áp dụng |
| :--- | :--- | :--- | :--- |
| **KPI & Health Cards** | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardBadge` | Thống kê số lượng user, dung lượng S3, tình trạng service | `bg-surface`, `border-line`, `text-ink`, `bg-lime` |
| **Dung lượng Quota Bar** | `ProgressBar` | Hiển thị % dung lượng S3 Garage đã dùng theo từng Org | `bg-paper`, `bg-lime`, `bg-red-600` (khi >90%) |
| **Bảng dữ liệu** | `TableContainer`, `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell` | Danh sách Users, Organizations, Audit Logs | `bg-surface`, `border-line`, `text-muted`, `text-ink` |
| **Trạng thái Trống** | `TableEmptyState` | Khi bộ lọc không có kết quả hoặc dữ liệu rỗng | `bg-surface/60`, `border-line`, `text-muted` |
| **Tìm kiếm & Bộ lọc** | `FilterToolbar` | Tìm theo tên/email, đếm số lượng, sắp xếp, lọc vai trò | `bg-surface`, `bg-paper`, `text-ink`, `border-line` |
| **Tab Chuyển đổi** | `Tabs` (variant="pills") | Điều hướng giữa 4 tab Overview, Users, Orgs, Logs | `bg-lime`, `border-ink`, `text-ink`, `text-muted` |
| **Nhãn Vai trò & Status** | `Badge` | Gắn nhãn `SUPER ADMIN` (`lime`), `SUPPORT` (`cyan`), `ACTIVE` (`success`), `SUSPENDED` (`danger`) | `lime`, `cyan`, `success`, `danger`, `surface` |
| **Nút bấm & Thao tác** | `Button` | Nút Đổi quyền, Khóa tài khoản, Xuất báo cáo, Tải lại | `primary` (`bg-ink`), `outline`, `danger`, `lime` |
| **Menu Thao tác theo Dòng** | `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem`, `DropdownSeparator` | Menu "..." thao tác trên từng user / org | `border-line`, `bg-surface`, `bg-paper` |
| **Hộp thoại Xác nhận** | `Dialog`, `DialogHeader`, `DialogEyebrow`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogCloseButton` | Modal phân quyền `platform_role`, Modal chỉnh hạn mức quota | `bg-surface`, `border-line`, `backdrop-blur-sm` |
| **Hình đại diện** | `Avatar` | Avatar người dùng trong bảng User & Audit Log | `tone="dark"`, `tone="lime"`, `tone="surface"` |

---

## 4. Các Giai đoạn Thực hiện (Implementation Phases)

### Phase 1: Module Setup, Types & Mock Data Engine
- Định nghĩa các interface chuẩn trong `apps/web/src/modules/admin/types.ts`:
  - `AdminPlatformRole = 'user' | 'support' | 'super_admin'`
  - `AdminUserStatus = 'active' | 'suspended'`
  - `AdminUser`, `AdminOrganization`, `SystemHealthStatus`, `PlatformMetrics`, `AdminAuditLog`
- Xây dựng kho Mock Data thực tế trong `apps/web/src/modules/admin/lib/mock_data.ts` mô phỏng đầy đủ dữ liệu người dùng, tổ chức, metrics hạ tầng thực tế từ Feed.io.

### Phase 2: Code UI Components của 4 Tab Quản Trị
- **Tab 1: `OverviewTab`**:
  - 4 thẻ KPI lớn: Tổng người dùng (Users), Tổ chức hoạt động (Organizations), Tổng dung lượng Video S3 (Storage), Thông lượng hệ thống (Req/s & Rate Limit Health).
  - Bảng trạng thái Service Health: PostgreSQL, Valkey Cache, RabbitMQ Queue, Garage S3, Cloudflare Tunnel Ingress Gateway.
  - Phân bổ lưu trữ: Media gốc, Transcoded Proxies, Waveform Visualizer Cache.
- **Tab 2: `UsersTab`**:
  - `FilterToolbar` tìm kiếm realtime theo tên/email, dropdown lọc theo Role (`All`, `Super Admin`, `Support`, `User`), lọc trạng thái (`Active`, `Suspended`).
  - `Table` hiển thị avatar, tên, email, vai trò (`Badge`), số workspace tham gia, ngày đăng ký, trạng thái.
  - `Dialog` đổi vai trò nền tảng (`ChangePlatformRoleDialog`).
  - `Dialog` xác nhận khóa / mở khóa tài khoản (`SuspendUserDialog`).
- **Tab 3: `OrganizationsTab`**:
  - Bảng danh sách tổ chức, gói dịch vụ (`Free`, `Pro`, `Enterprise`), thanh dung lượng `ProgressBar`, số lượng thành viên và project.
  - `Dialog` điều chỉnh hạn mức lưu trữ S3 (`AdjustQuotaDialog`).
- **Tab 4: `AuditLogsTab`**:
  - Bảng lịch sử hoạt động quản trị viên: thời gian, người thực hiện, hành động (`USER_ROLE_CHANGED`, `USER_SUSPENDED`, `STORAGE_QUOTA_INCREASED`, `RATE_LIMIT_BLOCKED`), IP, trạng thái.

### Phase 3: Screen Assembly, Access Control & Routing
- **`AdminScreen`**:
  - Kiểm tra quyền truy cập: `user.platform_role in ('support', 'super_admin')`.
  - Nếu là user thông thường: Hiển thị giao diện 403 Forbidden trang nhã với `Card`, `Badge danger`, thông báo giải thích và nút `Return to App`.
  - Tích hợp `Tabs` mượt mà, lưu tab đang chọn.
- **Cập nhật `AppShell` (`apps/web/src/modules/navigation/components/app_shell.tsx`)**:
  - Tự động hiển thị menu item **"Admin Panel"** với icon `Shield` trong mục điều hướng Global Navigation nếu tài khoản có `platform_role === 'super_admin' || platform_role === 'support'`.
- **Tạo Page Router (`apps/web/src/app/(app)/app/admin/page.tsx`)**:
  - Route chính thức `/app/admin` render `<AdminScreen />`.

### Phase 4: Thư viện Storybook Đầy đủ cho Người dùng Kiểm thử
- Xây dựng 5 file Stories hoàn chỉnh:
  1. `admin_screen.stories.tsx`: Màn hình Admin tổng thể (kịch bản Super Admin, Support Admin, Giao diện 403 Forbidden, Standalone không AppShell).
  2. `overview_tab.stories.tsx`: Tab Overview (kịch bản hệ thống bình thường, kịch bản tải cao / cảnh báo dung lượng).
  3. `users_tab.stories.tsx`: Tab Users (kịch bản danh sách đầy đủ, kịch bản lọc tìm kiếm, kịch bản kết quả trống, mở dialog đổi quyền).
  4. `organizations_tab.stories.tsx`: Tab Organizations (kịch bản quản lý workspace & chỉnh sửa quota).
  5. `audit_logs_tab.stories.tsx`: Tab Audit Logs (kịch bản timeline hoạt động bảo mật).

### Phase 5: Verification & Testing
- Chạy `pnpm build-storybook` để đảm bảo 100% storybook stories build thành công không lỗi cú pháp hay import.
- Chạy `pnpm test` / `vitest` cho các component admin.
- Chạy `pnpm typecheck` xác nhận kiểu dữ liệu sạch sẽ.
