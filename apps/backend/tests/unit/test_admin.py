import pytest
from httpx import ASGITransport, AsyncClient
from uuid import uuid4

from feedio.entrypoints.api import create_app
from feedio.modules.identity.domain.value_objects import CurrentUser, PlatformRole


@pytest.fixture
def super_admin_user() -> CurrentUser:
    return CurrentUser(
        id=uuid4(),
        email="khanhnguyenkim30825@gmail.com",
        email_verified=True,
        platform_role=PlatformRole.SUPER_ADMIN,
    )


@pytest.fixture
def regular_user() -> CurrentUser:
    return CurrentUser(
        id=uuid4(),
        email="regular@feedio.local",
        email_verified=True,
        platform_role=PlatformRole.USER,
    )


@pytest.mark.asyncio
async def test_admin_overview_super_admin(super_admin_user: CurrentUser) -> None:
    test_app = create_app(current_user_provider=lambda: super_admin_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/overview")
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert "system_health" in data
        assert data["metrics"]["total_users"] >= 1
        assert len(data["system_health"]) >= 4


@pytest.mark.asyncio
async def test_admin_overview_forbidden_for_regular_user(regular_user: CurrentUser) -> None:
    test_app = create_app(current_user_provider=lambda: regular_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/overview")
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_users_and_role_change(super_admin_user: CurrentUser) -> None:
    test_app = create_app(current_user_provider=lambda: super_admin_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List users
        res = await client.get("/api/v1/admin/users")
        assert res.status_code == 200
        users = res.json()
        assert len(users) >= 1
        target = next((u for u in users if u["id"] != str(super_admin_user.id)), users[0])
        original_role = target["platform_role"]
        original_status = target["status"]

        # 2. Update role
        new_test_role = "user" if original_role != "user" else "support"
        res = await client.patch(
            f"/api/v1/admin/users/{target['id']}/role",
            json={"new_role": new_test_role},
        )
        assert res.status_code == 200
        updated = res.json()
        assert updated["platform_role"] == new_test_role

        # 3. Update status
        res = await client.patch(
            f"/api/v1/admin/users/{target['id']}/status",
            json={"new_status": "suspended"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "suspended"

        # Revert status & role
        res = await client.patch(
            f"/api/v1/admin/users/{target['id']}/status",
            json={"new_status": original_status},
        )
        assert res.status_code == 200
        assert res.json()["status"] == original_status

        await client.patch(
            f"/api/v1/admin/users/{target['id']}/role",
            json={"new_role": original_role},
        )


@pytest.mark.asyncio
async def test_admin_organizations_and_quota(super_admin_user: CurrentUser) -> None:
    test_app = create_app(current_user_provider=lambda: super_admin_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/organizations")
        assert res.status_code == 200
        orgs = res.json()
        assert len(orgs) >= 1
        demo_org = next((o for o in orgs if o["slug"] == "demo-0821e369"), orgs[0])
        original_quota = demo_org["storage_limit_bytes"]

        # Update quota to 250 GB
        new_quota = 250 * 1024 * 1024 * 1024
        res = await client.patch(
            f"/api/v1/admin/organizations/{demo_org['id']}/quota",
            json={"new_quota_bytes": new_quota},
        )
        assert res.status_code == 200
        assert res.json()["storage_limit_bytes"] == new_quota

        # Revert quota
        await client.patch(
            f"/api/v1/admin/organizations/{demo_org['id']}/quota",
            json={"new_quota_bytes": original_quota},
        )


@pytest.mark.asyncio
async def test_admin_audit_logs(super_admin_user: CurrentUser) -> None:
    test_app = create_app(current_user_provider=lambda: super_admin_user)
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/audit-logs")
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) >= 1
        assert logs[0]["action"] in (
            "ORGANIZATION_CREATED",
            "USER_ROLE_CHANGED",
            "STORAGE_QUOTA_INCREASED",
            "USER_SUSPENDED",
            "USER_ACTIVATED",
        )
