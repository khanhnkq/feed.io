from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from fastapi import FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.models import CurrentUser, IdentityClaims, OidcTokens
from feedio.modules.identity.presentation.cookies import AuthCookieSettings
from feedio.modules.identity.presentation.router import create_auth_router


class FakeOidcClient:
    def __init__(self) -> None:
        self.refreshed_tokens: list[str] = []
        self.revoked_tokens: list[str] = []

    def authorization_url(self, state: str, code_challenge: str) -> str:
        return f"http://keycloak.test/auth?state={state}&code_challenge={code_challenge}"

    async def exchange_code(self, code: str, code_verifier: str) -> OidcTokens:
        assert code == "authorization-code"
        assert code_verifier
        return OidcTokens("access-1", "refresh-1", 300, 1800)

    async def refresh(self, refresh_token: str) -> OidcTokens:
        self.refreshed_tokens.append(refresh_token)
        return OidcTokens("access-2", "refresh-2", 300, 1800)

    async def revoke(self, token: str) -> None:
        self.revoked_tokens.append(token)


class FakeVerifier:
    async def verify(self, access_token: str) -> IdentityClaims:
        assert access_token in {"access-1", "access-2"}
        return IdentityClaims("subject-1", "editor@agency.test", "Agency Editor")


class FakeIdentityRepository:
    async def provision(self, claims: IdentityClaims) -> CurrentUser:
        return CurrentUser(uuid4(), claims.subject, claims.email, claims.display_name)


def create_client() -> tuple[TestClient, FakeOidcClient]:
    oidc = FakeOidcClient()

    async def provide_oidc() -> FakeOidcClient:
        return oidc

    async def provide_verifier() -> FakeVerifier:
        return FakeVerifier()

    async def provide_repository() -> FakeIdentityRepository:
        return FakeIdentityRepository()

    app = FastAPI()
    app.include_router(
        create_auth_router(
            oidc_provider=provide_oidc,
            verifier_provider=provide_verifier,
            identity_repository_provider=provide_repository,
            cookie_settings=AuthCookieSettings(secure=False),
            success_url="http://localhost:3000/projects",
        ),
        prefix="/api/v1",
    )
    return TestClient(app), oidc


def login(client: TestClient) -> None:
    started = client.get("/api/v1/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(started.headers["location"]).query)["state"][0]
    completed = client.get(
        "/api/v1/auth/callback",
        params={"code": "authorization-code", "state": state},
        follow_redirects=False,
    )
    assert completed.status_code == 307


def test_login_uses_pkce_and_sets_http_only_token_cookies() -> None:
    client, _ = create_client()

    with client:
        started = client.get("/api/v1/auth/login", follow_redirects=False)
        location_query = parse_qs(urlparse(started.headers["location"]).query)
        state = location_query["state"][0]
        completed = client.get(
            "/api/v1/auth/callback",
            params={"code": "authorization-code", "state": state},
            follow_redirects=False,
        )
        current_user = client.get("/api/v1/auth/me")

    assert started.status_code == 307
    assert location_query["code_challenge"][0]
    assert completed.headers["location"] == "http://localhost:3000/projects"
    set_cookie = completed.headers.get_list("set-cookie")
    assert any("feedio_access_token=access-1" in item and "HttpOnly" in item for item in set_cookie)
    assert any(
        "feedio_refresh_token=refresh-1" in item and "HttpOnly" in item
        for item in set_cookie
    )
    assert any("feedio_csrf_token=" in item and "HttpOnly" not in item for item in set_cookie)
    assert current_user.status_code == 200
    assert current_user.json()["email"] == "editor@agency.test"


def test_refresh_rotates_cookies_and_logout_revokes_refresh_token() -> None:
    client, oidc = create_client()

    with client:
        login(client)
        csrf_token = client.cookies["feedio_csrf_token"]
        refreshed = client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": csrf_token},
        )
        csrf_token = client.cookies["feedio_csrf_token"]
        logged_out = client.post(
            "/api/v1/auth/logout",
            headers={"X-CSRF-Token": csrf_token},
        )

    assert refreshed.status_code == 204
    assert oidc.refreshed_tokens == ["refresh-1"]
    assert oidc.revoked_tokens == ["refresh-2"]
    assert logged_out.status_code == 204
    assert "feedio_access_token" not in client.cookies
    assert "feedio_refresh_token" not in client.cookies


def test_refresh_rejects_missing_csrf_header() -> None:
    client, oidc = create_client()

    with client:
        login(client)
        response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 403
    assert oidc.refreshed_tokens == []
