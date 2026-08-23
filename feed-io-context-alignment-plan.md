# Feed.io Context Alignment Plan

## Goal

Đồng bộ ubiquitous language, database, backend, API và frontend theo cây chuẩn: `User → Global Dashboard → Workspace → Project → Asset → Review`, không dùng `Organization` như từ đồng nghĩa của `Workspace`.

## Canonical contexts

| Context | Aggregate/role chuẩn | Boundary |
|---|---|---|
| Platform | `User`, `PlatformRole` | Quản trị Feed.io; không tự động bypass tenant |
| Global dashboard | View tổng hợp workspace của user | Không phải database aggregate |
| Workspace | `Workspace`, `WorkspaceMember`, `WorkspaceRole` | Tenant và billing/collaboration boundary |
| Project | `Project`, `ProjectMember`, `ProjectRole` | Review room nằm trong một workspace |
| Media review | `Folder`, `Asset`, `AssetVersion`, `Comment`, `Annotation`, `Review` | Luôn truy ngược được `project_id` và `workspace_id` |

Role namespace mặc định:

- `users.platform_role`: `user | support | super_admin`.
- `workspace_members.workspace_role`: `owner | admin | member | viewer`.
- `project_members.project_role`: `manager | editor | reviewer | viewer`.
- Platform admin không có quyền đọc tenant mặc định; support access là session có reason, expiry và audit ở slice sau.

## Tasks

- [ ] **1. Chốt ADR ubiquitous language:** ghi rõ Platform, Global Dashboard, Workspace, Project và Media Review; đánh dấu mọi `Organization*` hiện tại là tên cần loại bỏ. → Verify: glossary chỉ có một nghĩa cho mỗi thuật ngữ và ADR được liên kết từ README.
- [ ] **2. Thêm migration đổi tenant vocabulary:** transactionally rename `organizations → workspaces`, `organization_members → workspace_members`, `organization_invitations → workspace_invitations`, `organization_id → workspace_id`, `role → workspace_role`; thêm `users.platform_role` với default `user`. → Verify: upgrade/downgrade trên DB có dữ liệu giữ nguyên UUID, membership, project và constraint/index.
- [ ] **3. Rename backend module:** `modules/organizations → modules/workspaces`; đổi domain models, repositories, ports, dependencies và errors sang `Workspace*`; không để compatibility alias trong domain/application. → Verify: `rg -i organization` chỉ còn migration lịch sử/ADR và import-linter giữ đúng dependency direction.
- [ ] **4. Tách authorization theo scope:** tạo `PlatformRole`, `WorkspaceRole`, `ProjectRole`; implement `require_platform_role`, `require_workspace_permission`, `require_project_permission`; tenant repository luôn kiểm active workspace membership. → Verify: permission matrix test chứng minh platform user, workspace owner/admin/member/viewer và cross-workspace access hoạt động đúng.
- [ ] **5. Chuẩn hóa REST context:** thay `/organizations` bằng `/workspaces`; thêm `GET /workspaces` cho Global Dashboard, `POST /workspaces`, `GET /workspaces/{workspace_id}`; chuyển project API thành `/workspaces/{workspace_id}/projects` và lấy context từ path thay vì `X-Organization-Id`. → Verify: OpenAPI không còn endpoint/header Organization và request chéo workspace trả 403/404.
- [ ] **6. Sửa frontend hierarchy/routes:** `/dashboard` là Global Dashboard liệt kê workspace; `/workspaces/[workspaceSlug]` là Workspace Dashboard; project nằm tại `/workspaces/[workspaceSlug]/projects` và `/workspaces/[workspaceSlug]/projects/[projectId]`; onboarding redirect đến workspace vừa tạo. → Verify: login có workspace → Global Dashboard, chưa có workspace → onboarding, click workspace → đúng workspace dashboard, không tự tạo project.
- [ ] **7. Scope frontend state/cache:** query keys và Axios calls luôn nhận `workspaceId`; không lưu một “active organization” ngầm toàn cục; breadcrumb phản ánh `Workspace → Project → Asset`. → Verify: chuyển giữa hai workspace không hiển thị cache/project của workspace trước.
- [ ] **8. Chuẩn bị hierarchy dưới Project:** migration/project slice tạo `project_members`, `folders`, `assets`, `asset_versions`, rồi review slice tạo `comments`, `annotations`, `reviews`; mọi bảng tenant có composite FK/index với `workspace_id`. → Verify: database từ chối folder/project/asset reference chéo workspace và folder cycle.
- [ ] **9. Regenerate và cập nhật tài liệu:** OpenAPI → Orval Axios client, README tree, database plan, system overview, local runbook và test flow. → Verify: generated client sạch, `rg -i organization` đạt allowlist, README dưới 500 dòng.
- [ ] **10. Verification cuối:** chạy migration rehearsal, backend unit/contract/integration, frontend route/cache tests, `make verify`, Docker rebuild và E2E hai workspace. → Verify: `register → verify → login → global dashboard → workspace dashboard → project` pass và rollback migration được chứng minh.

## Migration policy

Dự án đang ở early development nên dùng một transactional rename migration có downgrade đầy đủ, triển khai API/Web cùng lúc trong maintenance window. Khi đã có production traffic, mọi rename sau đó phải dùng expand-contract và dual compatibility thay vì breaking migration.

## Done when

- Không còn trường hợp `Workspace` trên UI nhưng `Organization` trong code/database cho cùng một entity.
- Global Dashboard và Workspace Dashboard là hai route/context khác nhau.
- Mọi role và permission đều thể hiện scope Platform, Workspace hoặc Project.
- Không thể đọc hoặc ghi dữ liệu chéo workspace qua API, cache frontend hoặc database relationship.
