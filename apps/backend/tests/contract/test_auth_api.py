from dataclasses import dataclass
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.entities import SessionView
from feedio.modules.identity.domain.value_objects import AuthTokens, CurrentUser
from feedio.modules.identity.presentation.cookies import AuthCookieSettings
from feedio.modules.identity.presentation.router import create_auth_router


@dataclass
class FakeAuthService:
    registered: dict[str, object] | None = None
    verified_token: str | None = None
    reset_token: str | None = None
    revoked_session: UUID | None = None

    async def register(self, **values: object) -> None:
        self.registered = values

    async def verify_email(self, token: str) -> None:
        self.verified_token = token

    async def resend_verification(self, email: str) -> None: ...

    async def login(self, **_: object) -> AuthTokens:
        return AuthTokens("access-1", "refresh-1", 300, 2_592_000)

    async def refresh(self, refresh_token: str) -> AuthTokens:
        assert refresh_token == "refresh-1"
        return AuthTokens("access-2", "refresh-2", 300, 2_592_000)

    async def logout(self, refresh_token: str | None) -> None:
        assert refresh_token == "refresh-2"

    async def forgot_password(self, email: str) -> None: ...

    async def reset_password(self, token: str, new_password: str) -> None:
        self.reset_token = token

    async def list_sessions(self, user_id: UUID) -> list[SessionView]:
        return [SessionView(uuid4(), "Browser", "127.0.0.1", True)]

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        self.revoked_session = session_id


def create_client() -> tuple[TestClient, FakeAuthService]:
    service = FakeAuthService()
    current_user = CurrentUser(uuid4(), "owner@agency.test", "Agency Owner", True)

    async def provide_service() -> FakeAuthService:
        return service

    async def provide_user() -> CurrentUser:
        return current_user

    app = FastAPI()
    app.include_router(
        create_auth_router(
            auth_service_provider=provide_service,
            current_user_provider=provide_user,
            cookie_settings=AuthCookieSettings(secure=False),
        ),
        prefix="/api/v1",
    )
    return TestClient(app), service


def test_register_verify_and_login_set_secure_session_cookies() -> None:
    client, service = create_client()

    with client:
        registered = client.post(
            "/api/v1/auth/register",
            json={
                "email": "owner@agency.test",
                "password": "correct horse battery staple",
                "display_name": "Agency Owner",
            },
        )
        verified = client.post("/api/v1/auth/verify-email", json={"token": "verify-1"})
        logged_in = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@agency.test", "password": "correct horse battery staple"},
        )

    assert registered.status_code == 202
    assert service.registered == {
        "email": "owner@agency.test",
        "password": "correct horse battery staple",
        "display_name": "Agency Owner",
    }
    assert verified.status_code == 204
    assert service.verified_token == "verify-1"
    assert logged_in.status_code == 204
    cookies = logged_in.headers.get_list("set-cookie")
    assert any("feedio_access_token=access-1" in item and "HttpOnly" in item for item in cookies)
    assert any("feedio_refresh_token=refresh-1" in item and "HttpOnly" in item for item in cookies)
    assert any("feedio_csrf_token=" in item and "HttpOnly" not in item for item in cookies)


def test_current_user_reports_organization_onboarding_state() -> None:
    client, _ = create_client()

    with client:
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["has_organization"] is False


def test_refresh_rotates_cookie_and_logout_clears_session() -> None:
    client, _ = create_client()

    with client:
        client.post(
            "/api/v1/auth/login",
            json={"email": "owner@agency.test", "password": "correct horse battery staple"},
        )
        csrf = client.cookies["feedio_csrf_token"]
        refreshed = client.post("/api/v1/auth/refresh", headers={"X-CSRF-Token": csrf})
        csrf = client.cookies["feedio_csrf_token"]
        logged_out = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})

    assert refreshed.status_code == 204
    assert client.cookies.get("feedio_refresh_token") is None
    assert logged_out.status_code == 204


def test_password_recovery_and_session_management_contract() -> None:
    client, service = create_client()
    session_id = uuid4()

    with client:
        forgot = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "owner@agency.test"},
        )
        reset = client.post(
            "/api/v1/auth/reset-password",
            json={"token": "reset-1", "new_password": "another correct horse password"},
        )
        sessions = client.get("/api/v1/auth/sessions")
        revoked = client.delete(f"/api/v1/auth/sessions/{session_id}")

    assert forgot.status_code == 202
    assert reset.status_code == 204
    assert service.reset_token == "reset-1"
    assert sessions.status_code == 200
    assert revoked.status_code == 204
    assert service.revoked_session == session_id
