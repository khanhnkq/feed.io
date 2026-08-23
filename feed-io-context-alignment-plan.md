# Feed.io Context Alignment Plan

## Goal

Đồng bộ database, backend và UI theo domain hierarchy `User → Organization → Project → Asset → Version`, với mapping rõ ràng: `Organization` là tenant entity, `Workspace` là UI context của Organization.

## Canonical contexts

| Context | Aggregate/role chuẩn | Boundary |
|---|---|---|
| Platform | `User`, `PlatformRole` | Quản trị Feed.io; không tự động bypass tenant |
| Global dashboard | `User` + `OrganizationMember` projection | Không phải database aggregate |
| Workspace UI | `Organization`, `OrganizationMember`, `Project` | UI context của tenant Organization |
| Project workspace | `Project`, `ProjectMember`, `Folder`, `Asset`, `ShareLink` | Media room thuộc Organization |
| Media review | `Folder`, `Asset`, `AssetVersion`, `MediaObject`, `Comment`, `Annotation`, `ReviewDecision` | Luôn truy ngược được `organization_id` và `project_id` |

Role namespace mặc định:

- `users.platform_role`: `user | support | super_admin`.
- `organization_members.organization_role`: `owner | admin | member | viewer`.
- `project_members.project_role`: `manager | editor | reviewer | viewer`.
- Platform admin không có quyền đọc tenant mặc định; support access là session có reason, expiry và audit ở slice sau.

## Tasks

- [ ] **1. Chốt ADR và glossary theo layer:** domain dùng Organization, presentation dùng Workspace; ghi bảng UI → entity và cây `User → Organization → Project → Asset → Version`. → Verify: contributor xác định được term chuẩn chỉ bằng ADR/README.
- [ ] **2. Chuẩn hóa scoped roles:** thêm `users.platform_role`; rename `organization_members.role → organization_role`; khi tạo project members dùng `project_role`; giữ nguyên bảng `organizations` và `organization_id`. → Verify: migration upgrade/downgrade giữ nguyên membership/project hiện có.
- [ ] **3. Tách authorization theo scope:** implement `require_platform_role`, `require_organization_permission`, `require_project_permission`; platform admin không tự động bypass tenant. → Verify: permission matrix bao phủ platform, organization, project và cross-organization denial.
- [ ] **4. Bổ sung Global API projection:** `GET /organizations` trả các Organization mà user có membership; giữ `POST /organizations`; project API lấy organization context từ nested path thay vì header ngầm. → Verify: user chỉ nhận organization của mình và request chéo tenant trả 403/404.
- [ ] **5. Sửa route hierarchy:** `/app` là Global Dashboard; `/app/workspaces/[workspaceSlug]` là Workspace Dashboard; project và asset tiếp tục nested dưới workspace/project slug. → Verify: nhìn URL xác định được Global, Workspace, Project hay Asset context.
- [ ] **6. Giới hạn đúng ba dashboard:** Global quản lý workspace, Workspace quản lý project/member, Project Workspace quản lý media; Asset/Review chỉ là main content của Project Workspace. → Verify: không tồn tại dashboard/sidebar thứ tư cho Asset.
- [ ] **7. Làm sidebar context-aware:** Global sidebar có Home/Recent/Workspaces/Invitations; Workspace sidebar có Overview/Projects/Reviews/Members/Activity/Settings; Project sidebar có Media/Reviews/Members/Share/Settings và back-link workspace. → Verify: sidebar đổi đúng theo route nhưng giữ một shell/component composition.
- [ ] **8. Scope frontend state/cache:** query keys và Axios calls nhận `organizationId/projectId`; route slug được resolve sang entity ID; breadcrumb hiển thị Workspace → Project → Asset. → Verify: chuyển K Studio sang ABC Media không rò cache/project.
- [ ] **9. Hoàn thiện ERD theo slice:** Project thêm members/folders/assets/share links; Asset thêm versions/media objects; Review thêm comments/annotations/decisions; mọi child giữ composite tenant FK/index. → Verify: PostgreSQL từ chối reference chéo Organization/Project/Asset.
- [ ] **10. Regenerate, document, verify:** cập nhật OpenAPI/Orval, README tree, ERD/runbook; chạy migration rehearsal, `make verify`, Docker build và E2E hai organization. → Verify: login → `/app` → workspace → project → asset review pass.

## Migration policy

Không rename `organizations` thành `workspaces`. Migration hiện tại chỉ bổ sung/đổi tên role có scope và các bảng hierarchy còn thiếu. Dự án đang early development nên column rename có thể transactionally deploy cùng API/Web; sau production phải dùng expand-contract.

## Done when

- `Organization` luôn là domain/database tenant; `Workspace` luôn là UI/route context, có mapping được tài liệu hóa.
- `/app`, Workspace Dashboard và Project Workspace là ba context chính khác nhau.
- Mọi role và permission đều thể hiện scope Platform, Organization hoặc Project.
- Không thể đọc hoặc ghi dữ liệu chéo Organization qua API, cache frontend hoặc database relationship.
