# Kế Hoạch Tối Ưu Phản Hồi Tức Thì (Optimistic UI) & Giảm Thiểu Latency DB Toàn Dự Án Feed.io

> **Mục tiêu:** Chuyển đổi toàn bộ các luồng thao tác người dùng từ mô hình *chờ server + refetch* (~1.2s - 2.0s) sang mô hình **Optimistic UI phản hồi 0ms**, cập nhật trực tiếp React Query cache, xử lý WebSocket không query lại toàn bộ danh sách, và tinh giản câu truy vấn backend đến Neon PostgreSQL Singapore.

---

## 1. Nguyên Tắc Thiết Kế Chuẩn (5 Trụ Cột Áp Dụng Toàn Bộ Dự Án)

```
[User Action] ──► (1) Optimistic Update (0ms) ──► UI đổi trạng thái ngay
                        │
                        ├─► (2) Background API Request ──► Server xử lý (giảm query thừa)
                        │         │
                        │         ├─ Thành công ──► Merge response server vào cache (0 refetch)
                        │         └─ Thất bại   ──► (3) Rollback trạng thái cũ + Toast lỗi
                        │
[WebSocket Event] ──► (4) Ingest Payload trực tiếp vào Cache (Không refetch full list)
```

| Hạng mục | Cơ chế cũ (Chậm) | Cơ chế mới (Chuẩn tối ưu) |
|---|---|---|
| **Phản hồi UI** | Chờ server phản hồi rồi mới cập nhật UI (delay 1s - 2s) | **Optimistic Update (0ms)**: Đổi UI ngay lập tức khi click |
| **Quản lý Cache** | Gọi `invalidateQueries` / `refetch()` tải lại cả danh sách | **`queryClient.setQueryData`**: Cập nhật tại chỗ (In-place) |
| **Realtime Socket** | Nhận event socket → gọi `invalidateQueries` gây bão GET | **Ingest Payload**: Lấy object trong socket cập nhật thẳng vào cache |
| **Xử lý sự cố** | N/A (UI đơ nếu lỗi hoặc lệch state) | **Rollback & Toast**: Tự hoàn tác về snapshot cũ nếu API fail |
| **Backend Query** | 4 - 5 queries tuần tự qua Singapore (~350ms) | Tinh giản còn 2 - 3 queries (bỏ kiểm tra dư thừa parent entity) |

---

## 2. Kế Hoạch Triển Khai Chi Tiết Theo Từng Nhóm API (100% Khép Kín)

### Giai Đoạn 1: Comments & Review Workspace (Ưu tiên số 1)
*Vấn đề: Bấm resolve/reopen comment delay 1-2s do chờ PATCH và refetch full comments 2 lần.*

- [x] **Task 1.1: Optimistic UI cho Resolve/Reopen Comment**
  - **File:** `apps/web/src/modules/review/components/review_workspace.tsx`
  - **Hành động:** Trong `handleResolveToggle`, snapshot cache `getListMediaCommentsQueryKey`, dùng `queryClient.setQueryData` cập nhật `status: "resolved" | "open"` ngay tại thời điểm click. Đồng thời cập nhật `activeComment`.
  - **Rollback:** Trong khối `catch`, khôi phục lại snapshot cũ nếu API lỗi.
  - **Xóa bỏ refetch:** Bỏ lệnh `invalidateComments()` và `refetchComments()` sau khi mutate thành công; thay bằng merge object `CommentResponse` trả về từ mutation.
  - **Kiểm tra:** Bấm Resolve trên comment thread, icon chuyển xanh ngay lập tức tại 0ms; kiểm tra tab Network không thấy request `GET /comments` nào được gửi sau đó.

- [x] **Task 1.2: Optimistic UI cho Xóa Comment**
  - **File:** `apps/web/src/modules/review/components/review_workspace.tsx`
  - **Hành động:** Trong `handleDeleteComment`, lọc bỏ `commentId` khỏi cache danh sách comment ngay trước khi gọi `deleteCommentMutation`.
  - **Kiểm tra:** Bấm xóa comment, comment biến mất ngay lập tức; nếu server lỗi thì hiện lại.

- [x] **Task 1.3: Tối ưu WebSocket Handler `comment.updated` & `comment.deleted`**
  - **File:** `apps/web/src/modules/review/components/review_workspace.tsx` & `apps/web/src/modules/collaboration/hooks/use_realtime_media.ts`
  - **Hành động:** Sửa callback `onCommentUpdated` để nhận `payload.comment` và cập nhật trực tiếp vào cache bằng `setQueryData`, thay vì gọi `invalidateComments()`.
  - **Kiểm tra:** Khi một tab khác cập nhật comment, tab hiện tại cập nhật trạng thái ngay mà không sinh thêm request `GET /comments`.

- [x] **Task 1.4: Tinh giản Query Backend trong Comments Router**
  - **File:** `apps/backend/src/feedio/modules/comments/presentation/router.py`
  - **Hành động:** Trong `update_comment_endpoint` và `delete_comment_endpoint`, bỏ bước `media_repository.get_by_id` vì câu lệnh `comment_repository.get_by_id` đã xác thực quan hệ `media_id`, `project_id`, `organization_id`.
  - **Kiểm tra:** Chạy test backend `test_media_comments.py` đảm bảo pass 100%, đo thời gian PATCH giảm ~70ms.

---

### Giai Đoạn 2: Kanban & Review Decisions
*Vấn đề: Kéo thả thẻ trên Kanban hoặc bấm duyệt (Approve) làm đơ giao diện và refetch toàn bộ media của project.*

- [x] **Task 2.1: Optimistic UI cho Thao Tác Kéo Thả Thẻ Trên Kanban**
  - **File:** `apps/web/src/app/(app)/app/organizations/[slug]/projects/[projectId]/kanban/page.tsx`
  - **Hành động:** Trong `handleStatusChange`, cập nhật ngay `review_status` của media trong cache query `["/api/v1/organizations/.../projects/.../media"]`. Thẻ chuyển cột ngay tức thì.
  - **Rollback:** Nếu `createDecisionMutation` lỗi, hoàn tác thẻ về cột ban đầu và hiển thị toast.
  - **Kiểm tra:** Kéo thả thẻ trên bảng Kanban, thẻ sang cột mới lập tức không có độ trễ.

- [x] **Task 2.2: Optimistic UI cho Review Decision Dropdown**
  - **File:** `apps/web/src/modules/review/components/decisions/review_decision_dropdown.tsx`
  - **Hành động:** Khi chọn trạng thái (Approved / Changes Requested / Needs Review), cập nhật ngay badge hiển thị và cache của media mà không chờ `invalidateQueries` quét lại toàn bộ media.
  - **Kiểm tra:** Chọn Approve, badge đổi xanh lập tức và dialog đóng ngay.

- [x] **Task 2.3: Optimistic Status Toggle trên Trang Project Issues**
  - **File:** `apps/web/src/modules/projects/components/issues/project_issues_screen.tsx`
  - **Hành động:** Trong `handleToggleStatus`, cập nhật ngay trạng thái `status: "resolved" | "open"` trong cache `project_issues` tại 0ms; bỏ cờ loading xoay vòng `updatingIssueId`.
  - **Kiểm tra:** Bấm checkmark trên trang Issues, trạng thái lật ngay tức thì.

---

### Giai Đoạn 3: Media Management & Version Stacking
*Vấn đề: Đổi tên video, xóa video, đổi version chính và gộp stack phải chờ server và refetch toàn bộ media.*

- [x] **Task 3.1: Đóng Dialog và Cập Nhật Tức Thì khi Đổi Tên Media**
  - **File:** `apps/web/src/modules/media/components/edit_media_dialog.tsx`
  - **Hành động:** Trong `handleSubmit`, cập nhật title trong cache query media của project ngay lập tức và gọi `onClose()` luôn. Mutation chạy ngầm trong background.
  - **Rollback:** Nếu API lỗi, khôi phục lại tên cũ và bung thông báo lỗi.
  - **Kiểm tra:** Bấm "Save Changes", dialog đóng ngay và tên video trên grid đổi mới tức thì.

- [x] **Task 3.2: Đóng Dialog và Xóa Thẻ Tức Thì khi Xóa Media**
  - **File:** `apps/web/src/modules/media/components/delete_media_dialog.tsx`
  - **Hành động:** Gọi `deleteMutation.mutate`, xóa `mediaId` khỏi cache query media và gọi `onClose()` ngay tại thời điểm bấm xác nhận xóa.
  - **Kiểm tra:** Bấm xác nhận xóa, dialog đóng ngay và video biến mất khỏi màn hình.

- [x] **Task 3.3: Tối ưu Version Stacking Dialog**
  - **File:** `apps/web/src/modules/media/components/version_stack_dialog.tsx`
  - **Hành động:** Loại bỏ hàm `invalidateData()` đang gọi 2 query tuần tự (`media` + `versionsQuery.refetch()`). Cập nhật nhãn phiên bản và version chính trực tiếp vào cache của `versionsQuery`.
  - **Kiểm tra:** Đổi nhãn `v1` -> `Final Cut`, nhãn cập nhật ngay mà không giật màn hình.

- [x] **Task 3.4: Tối Ưu Hóa Stack Confirm Dialog (Gộp Video Thành Phiên Bản)**
  - **File:** `apps/web/src/modules/media/components/stack_confirm_dialog.tsx`
  - **Hành động:** Cập nhật trực tiếp cache query media khi hoàn tất ghép version, đóng modal ngay tại 0ms; xóa bỏ lệnh `await queryClient.invalidateQueries`.
  - **Kiểm tra:** Xác nhận gộp stack, dialog đóng ngay lập tức.

---

### Giai Đoạn 4: Folder Management (Tạo, Đổi Tên, Di Chuyển & Xóa Thư Mục)
*Vấn đề: Mỗi thao tác thư mục đều chạy `await queryClient.invalidateQueries` làm treo giao diện.*

- [x] **Task 4.1: Tạo Thư Mục Phản Hồi Tức Thì**
  - **File:** `apps/web/src/modules/projects/components/create_folder_dialog.tsx`
  - **Hành động:** Khi mutation thành công (hoặc optimistic), chèn trực tiếp `FolderResponse` vào mảng thư mục trong cache và đóng dialog ngay. Xóa bỏ 2 lệnh `await queryClient.invalidateQueries` thừa.
  - **Kiểm tra:** Bấm "Create Folder", modal đóng ngay và folder mới xuất hiện trên cây thư mục.

- [x] **Task 4.2: Đổi Tên & Xóa Thư Mục Tức Thì**
  - **Files:** `apps/web/src/modules/projects/components/rename_folder_dialog.tsx`, `apps/web/src/modules/projects/components/delete_folder_dialog.tsx`
  - **Hành động:** Cập nhật tên mới hoặc lọc bỏ folder ID khỏi cache ngay lập tức và đóng dialog.
  - **Kiểm tra:** Đổi tên thư mục phản hồi ngay, không có độ trễ chờ đợi.

- [x] **Task 4.3: Optimistic Di Chuyển Thư Mục (Move Folder Dialog)**
  - **File:** `apps/web/src/modules/projects/components/move_folder_dialog.tsx`
  - **Hành động:** Cập nhật `parent_id` của thư mục trực tiếp trong cache danh sách folder của project và gọi `onClose()` ngay tại 0ms; bỏ lệnh `await queryClient.invalidateQueries`.
  - **Kiểm tra:** Bấm Move folder, modal đóng ngay và cây thư mục đổi vị trí tức thì.

---

### Giai Đoạn 5: Notifications (Đọc 1 & Đọc Tất Cả Thông Báo)
*Vấn đề: Bấm đọc thông báo đã cập nhật cache rồi nhưng lại gửi tiếp 2 request HTTP refetch thừa.*

- [x] **Task 5.1: Chuyển `useMarkNotificationRead` sang `onMutate`**
  - **File:** `apps/web/src/modules/notifications/hooks/use_notifications.ts`
  - **Hành động:** Đưa logic cập nhật `is_read = true` và giảm `total_unread` từ `onSuccess` lên `onMutate` (Optimistic 0ms).
  - **Xóa bỏ refetch thừa:** Xóa 2 dòng `queryClient.invalidateQueries` ở cuối hook.
  - **Kiểm tra:** Bấm vào thông báo, chấm đỏ tắt ngay tại 0ms; tab Network chỉ có 1 request PATCH, không có request GET nào bám theo sau.

- [x] **Task 5.2: Tối ưu `useMarkAllNotificationsRead`**
  - **File:** `apps/web/src/modules/notifications/hooks/use_notifications.ts`
  - **Hành động:** Đưa logic đặt `total_unread = 0` lên `onMutate`, xóa bỏ các lệnh `invalidateQueries` phía sau.
  - **Kiểm tra:** Bấm "Mark all as read", toàn bộ thông báo chuyển trạng thái đã đọc ngay tức khắc.

---

### Giai Đoạn 6: Thành Viên & Quyền Hạn (Organization & Project Members)
*Vấn đề: Đổi role, xóa thành viên, thu hồi lời mời đều gọi refetch toàn bộ danh sách thành viên.*

- [x] **Task 6.1: Optimistic Role Change & Remove Member trong Organization**
  - **Files:** `apps/web/src/modules/organizations/components/change_role_dialog.tsx`, `remove_member_dialog.tsx`, `members_screen.tsx`
  - **Hành động:** 
    - Khi đổi role: Cập nhật role của user trong cache `useListOrganizationMembers` ngay tại 0ms và đóng dialog.
    - Khi xóa member: Lọc bỏ member khỏi cache ngay và đóng dialog.
    - Khi thu hồi lời mời (`revokeMutation`): Lọc bỏ invitation khỏi cache `useListOrganizationInvitations` ngay, bỏ lệnh `invitationsQuery.refetch()`.
  - **Kiểm tra:** Đổi role thành viên hoặc xóa thành viên phản hồi tức thì.

- [x] **Task 6.2: Optimistic Project Member Role & Remove**
  - **File:** `apps/web/src/modules/projects/components/project_members_dialog.tsx`
  - **Hành động:** Cập nhật role ("editor" / "viewer") hoặc xóa thành viên khỏi project trực tiếp trong cache danh sách thành viên project, thay thế lệnh `invalidateMembers()`.
  - **Kiểm tra:** Thay đổi quyền trong dialog phản hồi ngay, không chờ refetch.

- [x] **Task 6.3: Optimistic Decline/Accept Invitation**
  - **File:** `apps/web/src/modules/organizations/components/user_invitations_screen.tsx`
  - **Hành động:** Khi bấm từ chối lời mời (`declineMutation`), lọc bỏ thẻ lời mời khỏi cache `getListMyInvitationsQueryKey` ngay tại 0ms; bỏ `await queryClient.invalidateQueries`.
  - **Kiểm tra:** Bấm Decline, thẻ lời mời biến mất ngay lập tức.

---

### Giai Đoạn 7: Share Links, Move Media & Public Guest Reviews
*Vấn đề: Tạo/thu hồi link chia sẻ, di chuyển video và trải nghiệm review của khách ngoài (Guest) bị delay.*

- [x] **Task 7.1: Quản Lý Share Links (Tạo & Thu Hồi Link)**
  - **File:** `apps/web/src/modules/media/components/share_media_dialog.tsx`
  - **Hành động:**
    - Khi tạo link thành công: Chèn object link mới vào đầu cache `getListShareLinksQueryKey`, không gọi `invalidateQueries`.
    - Khi thu hồi link: Đổi trạng thái `is_revoked: true` hoặc lọc bỏ link khỏi cache ngay tại 0ms, không gọi `invalidateQueries`.
  - **Kiểm tra:** Bấm Revoke link, trạng thái chuyển ngay mà không sinh thêm request GET.

- [x] **Task 7.2: Di Chuyển Media Giữa Các Thư Mục (Move Media)**
  - **File:** `apps/web/src/modules/media/components/move_media_dialog.tsx`
  - **Hành động:** Cập nhật `folder_id` của media trong cache query media của project ngay lập tức và đóng dialog tại 0ms.
  - **Kiểm tra:** Bấm Move, dialog đóng ngay và media biến mất khỏi folder cũ, xuất hiện ở folder mới.

- [x] **Task 7.3: Phản Hồi Tức Thì Trong Trang Guest Review (Public Share)**
  - **File:** `apps/web/src/app/share/[token]/page.tsx`
  - **Hành động:**
    - `createCommentMutation`: Chèn ngay comment của khách vào cache `getListPublicShareCommentsQueryKey(token)` tại 0ms, bỏ `invalidateQueries`.
    - `createDecisionMutation`: Cập nhật trực tiếp `review_status` trong cache `getGetPublicShareDetailsQueryKey(token)` tại 0ms, bỏ `invalidateQueries`.
  - **Kiểm tra:** Khách ngoài bấm Approve hoặc gõ comment, trạng thái cập nhật ngay lập tức.

---

### Giai Đoạn 8: Quản Lý Phiên Đăng Nhập, Hồ Sơ & Admin Dashboard
*Vấn đề: Thu hồi thiết bị, cập nhật profile và quản trị user bị giật và refetch thừa.*

- [x] **Task 8.1: Thu Hồi Phiên Đăng Nhập (Revoke Session)**
  - **File:** `apps/web/src/modules/auth/components/sessions_manager.tsx`
  - **Hành động:** Trong `useRevokeUserSession`, cập nhật cache `getListUserSessionsQueryKey` lọc bỏ `sessionId` bị xóa tại `onMutate` (0ms); bỏ `invalidateQueries`.
  - **Kiểm tra:** Bấm Revoke thiết bị, dòng thiết bị đó biến mất ngay lập tức.

- [x] **Task 8.2: Tối Ưu Admin User Status, Role & Org Quota**
  - **File:** `apps/web/src/modules/admin/hooks/use_admin.ts` & `admin_screen.tsx`
  - **Hành động:** Khi Super Admin đổi role, suspend user hoặc chỉnh quota, cập nhật trực tiếp item trong cache. Không bắn liên tiếp 3 query refetch (`users`, `overview`, `audit_logs`).
  - **Kiểm tra:** Đổi role user trên Admin Table phản hồi tức thì, không giật bảng dữ liệu.

- [x] **Task 8.3: Cập Nhật Profile & Avatar Người Dùng Phản Hồi Tức Thì**
  - **Files:** `apps/web/src/modules/profile/components/profile_form.tsx`, `avatar_uploader.tsx`
  - **Hành động:**
    - Trong `profile_form.tsx`: Cập nhật thẳng `getGetMyProfileQueryKey()` cache bằng dữ liệu mới; bỏ `queryClient.invalidateQueries`.
    - Trong `avatar_uploader.tsx`: Tạo preview cục bộ ngay bằng `URL.createObjectURL(file)` tại 0ms; khi upload xong cập nhật `avatar_url` vào cache profile mà không gọi `invalidateQueries`.
  - **Kiểm tra:** Bấm Save Profile hoặc chọn Avatar mới, hình và tên cập nhật ngay tức khắc.

---

### Giai Đoạn 9: Realtime Collaboration Project Hooks
*Vấn đề: Nhận event socket biến thành bão request refetch toàn bộ database.*

- [x] **Task 9.1: Ingest Trực Tiếp Payload Media từ WebSocket**
  - **File:** `apps/web/src/modules/collaboration/hooks/use_realtime_project.ts`
  - **Hành động:**
    - `media.created`: Chèn object media mới vào đầu mảng cache thay vì gọi `invalidateProjectMediaQuery()`.
    - `media.updated`: Tìm và cập nhật item tương ứng trong cache.
    - `media.deleted`: Lọc bỏ item khỏi cache.
  - **Kiểm tra:** Hai trình duyệt mở cùng 1 project: một bên đổi tên/xóa media, bên kia cập nhật tức thì với 0 request mạng phát sinh.

- [x] **Task 9.2: Ingest Trực Tiếp Payload Folder từ WebSocket**
  - **File:** `apps/web/src/modules/collaboration/hooks/use_realtime_project.ts`
  - **Hành động:** Thay thế `invalidateProjectFolderQuery()` bằng cập nhật trực tiếp cho `folder.created`, `folder.updated`, `folder.deleted`.
  - **Kiểm tra:** Cây thư mục đồng bộ tức thì giữa các người dùng mà không cần query lại server.

---

### Giai Đoạn 10: Quản Lý Dự Án & Tổ Chức (Project & Organization Dialogs)
*Vấn đề: Các dialog tạo/sửa/xóa Project và Organization đều `await queryClient.invalidateQueries` làm treo modal.*

- [x] **Task 10.1: Tạo, Đổi Tên & Xóa Dự Án (Projects Screen & Dialogs)**
  - **Files:** `apps/web/src/modules/projects/components/projects_screen.tsx`, `edit_project_dialog.tsx`, `delete_project_dialog.tsx`
  - **Hành động:**
    - `projects_screen.tsx`: Khi tạo dự án xong, chèn project mới vào đầu cache `getListProjectsQueryKey(orgId)` và gọi `setIsCreating(false)` ngay tại 0ms; bỏ `await invalidateQueries`.
    - `edit_project_dialog.tsx`: Cập nhật name/description trực tiếp trong cache `getListProjectsQueryKey` và `getGetProjectQueryKey`, đóng dialog ngay; bỏ `await Promise.all([invalidateQueries, invalidateQueries])`.
    - `delete_project_dialog.tsx`: Lọc bỏ project khỏi cache và đóng dialog ngay tại thời điểm bấm xác nhận; bỏ `await invalidateQueries`.
  - **Kiểm tra:** Bấm tạo/sửa/xóa project, modal đóng tức thì và danh sách cập nhật ngay.

- [x] **Task 10.2: Tạo, Đổi Tên, Xóa & Rời Khỏi Tổ Chức (Organization Dialogs)**
  - **Files:** `apps/web/src/modules/organizations/components/create_organization_dialog.tsx`, `edit_organization_dialog.tsx`, `delete_organization_dialog.tsx`, `leave_organization_dialog.tsx`
  - **Hành động:** Cập nhật `getListOrganizationsQueryKey()` trực tiếp (thêm mới, sửa tên, xóa bỏ item) và đóng dialog ngay lập tức; xóa bỏ các lệnh `await queryClient.invalidateQueries`.
  - **Kiểm tra:** Thao tác tổ chức không còn cảm giác bị đơ modal chờ network round-trip.

---

### Giai Đoạn 11: Backend Query Reduction & Kiểm Thử Toàn Diện
*Vấn đề: Giảm thiểu số lượng round-trip truy vấn tới Neon DB Singapore.*

- [x] **Task 11.1: Tinh giản `_verify_project_access` trong các router Media & Decisions**
  - **Files:** `apps/backend/src/feedio/modules/media/presentation/router.py`, `decisions_router.py`
  - **Hành động:** Khi user có role `owner` hoặc `admin` trong organization, bỏ qua bước query bảng `project_members`.
  - **Kiểm tra:** Đo latency của các endpoint POST /decisions và PATCH /media trên VPS, giảm ~50-70ms.

- [x] **Task 11.2: Chạy Toàn Bộ Test Suite Frontend & Backend**
  - **Lệnh kiểm tra:**
    ```bash
    # 1. Chạy toàn bộ test Web Frontend
    pnpm --filter @feedio/web test
    
    # 2. Chạy toàn bộ test Backend
    DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test" ./apps/backend/.venv/bin/pytest apps/backend/tests/unit
    ```
  - **Tiêu chuẩn hoàn thành:** 100% test files (54 frontend test suites + backend unit tests) đều PASS.

---

## 3. Tiêu Chí Nghiệm Thu (Definition of Done)

1. **Phản hồi người dùng (Perceived Latency):** Tất cả các thao tác tương tác chính (Resolve comment, Kéo Kanban, Đổi tên video, Xóa video, Đọc thông báo, Đổi role, Thu hồi link/session, Tạo/Sửa/Xóa folder, Tạo/Sửa/Xóa project, Update profile, Guest review) đều phản hồi giao diện tại **0ms**.
2. **Không có Request Thừa (Zero Redundant Refetches):** Sau khi thực hiện mutation thành công, không phát sinh thêm các request GET refetch toàn bộ danh sách.
3. **Realtime Đồng Bộ Nhẹ Nhàng:** WebSocket nhận event cập nhật trực tiếp dữ liệu thay vì kích hoạt bão query lên cơ sở dữ liệu.
4. **An Toàn Dữ Liệu:** Đầy đủ cơ chế rollback và thông báo lỗi nếu đường truyền mạng gặp sự cố.
