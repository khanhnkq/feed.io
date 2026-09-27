from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from feedio.modules.identity.application.ports import (
    AuthMailer,
    AuthRepository,
    OAuthClient,
    PasswordManager,
    TokenManager,
)
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.domain.entities import (
    AuthIdentityRecord,
    GoogleUserInfo,
    SessionView,
    UserRecord,
)
from feedio.modules.identity.domain.value_objects import (
    AuthTokens,
    CurrentUser,
    PlatformRole,
    TokenClaims,
)
from feedio.modules.identity.presentation.cookies import (
    OAUTH_STATE_COOKIE,
    OAUTH_VERIFIER_COOKIE,
    AuthCookieSettings,
)
from feedio.modules.identity.presentation.router import create_auth_router


class FakeOAuthClient(OAuthClient):
    def __init__(self) -> None:
        self.code_exchange_map: dict[str, GoogleUserInfo] = {}

    def get_authorization_url(self, *, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&challenge={code_challenge}"

    async def exchange_code(self, *, code: str, code_verifier: str) -> GoogleUserInfo:
        if code in self.code_exchange_map:
            return self.code_exchange_map[code]
        return GoogleUserInfo(
            sub="default-sub",
            email="default@gmail.com",
            email_verified=True,
            name="Default User",
        )


class RouterTestRepo(AuthRepository):
    def __init__(self) -> None:
        self.users: dict[str, UserRecord] = {}
        self.users_by_id: dict[UUID, UserRecord] = {}
        self.identities: dict[tuple[str, str], AuthIdentityRecord] = {}
        self.sessions: list[UUID] = []

    async def find_user_by_email(self, email: str) -> UserRecord | None:
        return self.users.get(email.strip().lower())

    async def find_user_by_id(self, user_id: UUID) -> UserRecord | None:
        return self.users_by_id.get(user_id)

    async def find_identity(
        self,
        provider: str,
        provider_user_id: str,
    ) -> AuthIdentityRecord | None:
        return self.identities.get((provider, provider_user_id))

    async def find_user_by_identity(
        self,
        provider: str,
        provider_user_id: str,
    ) -> UserRecord | None:
        identity = self.identities.get((provider, provider_user_id))
        if identity is None:
            return None
        return self.users_by_id.get(identity.user_id)

    async def link_identity(
        self,
        *,
        user_id: UUID,
        provider: str,
        provider_user_id: str,
        provider_email: str | None = None,
    ) -> AuthIdentityRecord:
        now = datetime.now(UTC)
        record = AuthIdentityRecord(
            id=uuid4(),
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
            created_at=now,
            updated_at=now,
        )
        self.identities[(provider, provider_user_id)] = record
        return record

    async def create_user_with_identity(
        self,
        *,
        email: str,
        provider: str,
        provider_user_id: str,
        provider_email: str | None = None,
        display_name: str | None = None,
    ) -> UserRecord:
        now = datetime.now(UTC)
        user = UserRecord(
            id=uuid4(),
            email=email.strip().lower(),
            password_hash=None,
            status="active",
            email_verified_at=now,
            platform_role=PlatformRole.USER,
        )
        self.users[user.email] = user
        self.users_by_id[user.id] = user
        await self.link_identity(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
        )
        return user

    async def clear_password_and_verify(self, user_id: UUID) -> None:
        pass

    async def create_pending_user(self, **kwargs) -> UserRecord:
        raise NotImplementedError

    async def replace_action_token(self, **kwargs) -> None:
        pass

    async def verify_email(self, token_hash: str) -> None:
        pass

    async def reset_password(self, token_hash: str, password_hash: str) -> None:
        pass

    async def create_session(self, *, session_id: UUID, **kwargs) -> None:
        self.sessions.append(session_id)

    async def rotate_session(self, **kwargs) -> bool:
        return True

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        pass

    async def revoke_session_by_token(self, session_id: UUID) -> None:
        pass

    async def list_sessions(self, user_id: UUID, current_session_id: UUID) -> list[SessionView]:
        return []

    async def current_user(self, user_id: UUID) -> CurrentUser | None:
        return None

    async def get_password_hash(self, user_id: UUID) -> str | None:
        user = self.users_by_id.get(user_id)
        return user.password_hash if user else None

    async def update_password_hash(self, user_id: UUID, new_hash: str) -> None:
        user = self.users_by_id.get(user_id)
        if user:
            self.users_by_id[user.id] = UserRecord(
                id=user.id,
                email=user.email,
                password_hash=new_hash,
                status=user.status,
                email_verified_at=user.email_verified_at,
                platform_role=user.platform_role,
            )

    async def revoke_other_sessions(self, user_id: UUID, current_session_id: UUID) -> None:
        pass


class FakePasswords(PasswordManager):
    def hash(self, password: str) -> str:
        return f"hashed_{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == f"hashed_{password}"


class FakeTokens(TokenManager):
    def issue(self, user_id: UUID, session_id: UUID) -> AuthTokens:
        return AuthTokens("acc", "ref", 300, 2592000)

    def verify_access(self, token: str) -> TokenClaims:
        return TokenClaims(uuid4(), uuid4(), uuid4())

    def verify_refresh(self, token: str) -> TokenClaims:
        return TokenClaims(uuid4(), uuid4(), uuid4())


class FakeMailer(AuthMailer):
    async def send_verification(self, *args, **kwargs) -> None:
        pass

    async def send_password_reset(self, *args, **kwargs) -> None:
        pass


def test_google_login_endpoint_returns_url_and_sets_cookies() -> None:
    repo = RouterTestRepo()
    service = AuthService(
        repository=repo,
        passwords=FakePasswords(),
        tokens=FakeTokens(),
        mailer=FakeMailer(),
        refresh_ttl_seconds=2592000,
    )
    oauth_client = FakeOAuthClient()

    app = FastAPI()
    router = create_auth_router(
        auth_service_provider=lambda: service,
        current_user_provider=lambda: CurrentUser(uuid4(), "test@test.com", True),
        cookie_settings=AuthCookieSettings(secure=False),
        oauth_client=oauth_client,
    )
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)

    response = client.get("/api/v1/auth/google/login")
    assert response.status_code == 200
    data = response.json()
    assert "auth_url" in data
    assert "https://accounts.google.com/o/oauth2/v2/auth" in data["auth_url"]

    # Check cookies
    assert OAUTH_STATE_COOKIE in response.cookies
    assert OAUTH_VERIFIER_COOKIE in response.cookies


def test_google_callback_endpoint_csrf_mismatch_fails() -> None:
    repo = RouterTestRepo()
    service = AuthService(
        repository=repo,
        passwords=FakePasswords(),
        tokens=FakeTokens(),
        mailer=FakeMailer(),
        refresh_ttl_seconds=2592000,
    )
    oauth_client = FakeOAuthClient()

    app = FastAPI()
    router = create_auth_router(
        auth_service_provider=lambda: service,
        current_user_provider=lambda: CurrentUser(uuid4(), "test@test.com", True),
        cookie_settings=AuthCookieSettings(secure=False),
        oauth_client=oauth_client,
    )
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)

    # Set cookies with one state
    client.cookies.set(OAUTH_STATE_COOKIE, "expected_state", path="/api/v1/auth")
    client.cookies.set(OAUTH_VERIFIER_COOKIE, "test_verifier", path="/api/v1/auth")

    # Call with a different state
    response = client.post(
        "/api/v1/auth/google/callback",
        json={"code": "sample_code", "state": "wrong_state"},
    )
    assert response.status_code == 400
    assert "OAuth state is invalid" in response.text


def test_google_callback_endpoint_success() -> None:
    repo = RouterTestRepo()
    service = AuthService(
        repository=repo,
        passwords=FakePasswords(),
        tokens=FakeTokens(),
        mailer=FakeMailer(),
        refresh_ttl_seconds=2592000,
    )
    oauth_client = FakeOAuthClient()
    oauth_client.code_exchange_map["valid_code"] = GoogleUserInfo(
        sub="google-user-789",
        email="callbackuser@gmail.com",
        email_verified=True,
        name="Callback User",
    )

    app = FastAPI()
    router = create_auth_router(
        auth_service_provider=lambda: service,
        current_user_provider=lambda: CurrentUser(uuid4(), "test@test.com", True),
        cookie_settings=AuthCookieSettings(secure=False),
        oauth_client=oauth_client,
    )
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)

    # 1. First trigger /api/v1/auth/google/login to get cookies naturally
    login_resp = client.get("/api/v1/auth/google/login")
    assert login_resp.status_code == 200
    state_cookie = login_resp.cookies[OAUTH_STATE_COOKIE]

    # 2. Call callback with matching state
    response = client.post(
        "/api/v1/auth/google/callback",
        json={"code": "valid_code", "state": state_cookie},
    )
    assert response.status_code == 204
    # User was created and session was issued
    user = repo.users.get("callbackuser@gmail.com")
    assert user is not None
    assert len(repo.sessions) == 1


def test_set_initial_password_endpoint() -> None:
    repo = RouterTestRepo()
    test_user_id = uuid4()
    # User created via Google with password_hash = None
    user = UserRecord(
        id=test_user_id,
        email="nopass@gmail.com",
        password_hash=None,
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[user.email] = user
    repo.users_by_id[user.id] = user

    service = AuthService(
        repository=repo,
        passwords=FakePasswords(),
        tokens=FakeTokens(),
        mailer=FakeMailer(),
        refresh_ttl_seconds=2592000,
    )

    app = FastAPI()
    router = create_auth_router(
        auth_service_provider=lambda: service,
        current_user_provider=lambda: CurrentUser(
            test_user_id,
            user.email,
            True,
            has_password=False,
        ),
        cookie_settings=AuthCookieSettings(secure=False),
    )
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)

    response = client.post(
        "/api/v1/auth/set-password",
        json={"new_password": "new_secure_password_123"},
    )
    assert response.status_code == 204

    # Now password has been set
    updated_user = repo.users_by_id[test_user_id]
    assert updated_user.password_hash == "hashed_new_secure_password_123"

    # Calling again fails with 400
    response2 = client.post(
        "/api/v1/auth/set-password",
        json={"new_password": "another_secure_password_123"},
    )
    assert response2.status_code == 400
