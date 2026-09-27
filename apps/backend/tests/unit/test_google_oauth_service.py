from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from feedio.modules.identity.application.ports import (
    AuthMailer,
    AuthRepository,
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
from feedio.modules.identity.domain.errors import (
    GoogleEmailNotVerifiedError,
    OAuthOnlyAccountError,
    UserDisabledError,
)
from feedio.modules.identity.domain.value_objects import (
    AuthTokens,
    CurrentUser,
    PlatformRole,
    TokenClaims,
)
from feedio.modules.identity.infrastructure.oauth_client import GoogleOAuthClient


class FakePasswordManager(PasswordManager):
    def hash(self, password: str) -> str:
        return f"hashed_{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == f"hashed_{password}"


class FakeTokenManager(TokenManager):
    def issue(self, user_id: UUID, session_id: UUID) -> AuthTokens:
        return AuthTokens(
            access_token=f"access_{user_id}",
            refresh_token=f"refresh_{user_id}",
            expires_in=300,
            refresh_expires_in=2592000,
        )

    def verify_access(self, token: str) -> TokenClaims:
        return TokenClaims(user_id=uuid4(), session_id=uuid4(), token_id=uuid4())

    def verify_refresh(self, token: str) -> TokenClaims:
        return TokenClaims(user_id=uuid4(), session_id=uuid4(), token_id=uuid4())


class FakeAuthMailer(AuthMailer):
    async def send_verification(
        self,
        email: str,
        token: str,
        display_name: str | None = None,
    ) -> None:
        pass

    async def send_password_reset(
        self,
        email: str,
        token: str,
        display_name: str | None = None,
    ) -> None:
        pass


class InMemoryAuthRepository(AuthRepository):
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
        user = self.users_by_id.get(user_id)
        if user:
            updated = UserRecord(
                id=user.id,
                email=user.email,
                password_hash=None,
                status=user.status,
                email_verified_at=datetime.now(UTC),
                platform_role=user.platform_role,
            )
            self.users[user.email] = updated
            self.users_by_id[user.id] = updated

    async def create_pending_user(self, *, email: str, password_hash: str) -> UserRecord:
        user = UserRecord(
            id=uuid4(),
            email=email.strip().lower(),
            password_hash=password_hash,
            status="active",
            email_verified_at=None,
            platform_role=PlatformRole.USER,
        )
        self.users[user.email] = user
        self.users_by_id[user.id] = user
        return user

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
            updated = UserRecord(
                id=user.id,
                email=user.email,
                password_hash=new_hash,
                status=user.status,
                email_verified_at=user.email_verified_at,
                platform_role=user.platform_role,
            )
            self.users[user.email] = updated
            self.users_by_id[user.id] = updated

    async def revoke_other_sessions(self, user_id: UUID, current_session_id: UUID) -> None:
        pass


@pytest.fixture
def auth_setup() -> tuple[AuthService, InMemoryAuthRepository]:
    repo = InMemoryAuthRepository()
    service = AuthService(
        repository=repo,
        passwords=FakePasswordManager(),
        tokens=FakeTokenManager(),
        mailer=FakeAuthMailer(),
        refresh_ttl_seconds=2592000,
    )
    return service, repo


@pytest.mark.asyncio
async def test_google_login_rejects_unverified_email(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, _ = auth_setup
    user_info = GoogleUserInfo(
        sub="sub-unverified",
        email="unverified@gmail.com",
        email_verified=False,
    )
    with pytest.raises(GoogleEmailNotVerifiedError):
        await service.login_with_google(user_info)


@pytest.mark.asyncio
async def test_google_login_creates_new_user_without_password(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    user_info = GoogleUserInfo(
        sub="sub-12345",
        email="newuser@gmail.com",
        email_verified=True,
        name="New User",
    )
    tokens = await service.login_with_google(user_info)
    assert tokens.access_token is not None

    user = await repo.find_user_by_email("newuser@gmail.com")
    assert user is not None
    assert user.password_hash is None
    assert user.email_verified_at is not None

    identity = await repo.find_identity("google", "sub-12345")
    assert identity is not None
    assert identity.user_id == user.id


@pytest.mark.asyncio
async def test_google_login_links_existing_verified_user(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    # Existing user with verified email and password
    existing = UserRecord(
        id=uuid4(),
        email="existing@studio.com",
        password_hash="hashed_secret123",
        status="active",
        email_verified_at=datetime.now(UTC),
        platform_role=PlatformRole.USER,
    )
    repo.users[existing.email] = existing
    repo.users_by_id[existing.id] = existing

    user_info = GoogleUserInfo(
        sub="sub-google-linked",
        email="existing@studio.com",
        email_verified=True,
    )
    tokens = await service.login_with_google(user_info)
    assert tokens.access_token is not None

    # Check identity linked
    identity = await repo.find_identity("google", "sub-google-linked")
    assert identity is not None
    assert identity.user_id == existing.id

    # Check original password preserved
    user = await repo.find_user_by_id(existing.id)
    assert user is not None
    assert user.password_hash == "hashed_secret123"


@pytest.mark.asyncio
async def test_google_login_pre_account_takeover_defense(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    # Attacker registered victim's email, but victim hasn't verified
    attacker_created = await repo.create_pending_user(
        email="victim@gmail.com",
        password_hash="hashed_attacker_pass",
    )
    assert attacker_created.email_verified_at is None

    # Victim logs in with Google (proves ownership)
    victim_info = GoogleUserInfo(
        sub="victim-sub-999",
        email="victim@gmail.com",
        email_verified=True,
        name="Victim Genuine",
    )
    tokens = await service.login_with_google(victim_info)
    assert tokens.access_token is not None

    # Verify: attacker's password was WIPED (set to None), email is verified
    user = await repo.find_user_by_id(attacker_created.id)
    assert user is not None
    assert user.password_hash is None
    assert user.email_verified_at is not None

    # Identity linked
    identity = await repo.find_identity("google", "victim-sub-999")
    assert identity is not None
    assert identity.user_id == attacker_created.id


@pytest.mark.asyncio
async def test_google_login_subsequent_login_via_identity(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    user_info = GoogleUserInfo(
        sub="sub-existing-id",
        email="multi@gmail.com",
        email_verified=True,
    )
    # First login creates account
    await service.login_with_google(user_info)
    # Second login uses existing identity
    tokens2 = await service.login_with_google(user_info)
    assert tokens2.access_token is not None


@pytest.mark.asyncio
async def test_google_login_disabled_user_rejected(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    disabled_user = UserRecord(
        id=uuid4(),
        email="disabled@gmail.com",
        password_hash=None,
        status="disabled",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[disabled_user.email] = disabled_user
    repo.users_by_id[disabled_user.id] = disabled_user

    user_info = GoogleUserInfo(
        sub="sub-disabled",
        email="disabled@gmail.com",
        email_verified=True,
    )
    with pytest.raises(UserDisabledError):
        await service.login_with_google(user_info)


@pytest.mark.asyncio
async def test_password_login_on_oauth_only_user_raises_friendly_error(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    oauth_user = UserRecord(
        id=uuid4(),
        email="googleonly@gmail.com",
        password_hash=None,  # No password
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[oauth_user.email] = oauth_user
    repo.users_by_id[oauth_user.id] = oauth_user

    with pytest.raises(OAuthOnlyAccountError):
        await service.login(email="googleonly@gmail.com", password="anypassword123")


@pytest.mark.asyncio
async def test_set_initial_password_allows_subsequent_password_login(
    auth_setup: tuple[AuthService, InMemoryAuthRepository],
) -> None:
    service, repo = auth_setup
    oauth_user = UserRecord(
        id=uuid4(),
        email="oauthsetpass@gmail.com",
        password_hash=None,
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[oauth_user.email] = oauth_user
    repo.users_by_id[oauth_user.id] = oauth_user

    # Setting initial password succeeds
    await service.set_initial_password(oauth_user.id, "my_new_password_123")

    # Now password login works!
    tokens = await service.login(email="oauthsetpass@gmail.com", password="my_new_password_123")
    assert tokens.access_token is not None

    # Calling set_initial_password again fails because user already has a password
    with pytest.raises(ValueError, match="already has a password"):
        await service.set_initial_password(oauth_user.id, "another_pass_456")


def test_google_oauth_client_authorization_url() -> None:
    client = GoogleOAuthClient(
        client_id="test-client-id",
        client_secret="test-secret",
        redirect_uri="http://localhost:3000/auth/callback/google",
    )
    url = client.get_authorization_url(state="csrf_state_123", code_challenge="challenge_xyz")
    assert "https://accounts.google.com/o/oauth2/v2/auth" in url
    assert "client_id=test-client-id" in url
    assert "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Fgoogle" in url
    assert "state=csrf_state_123" in url
    assert "code_challenge=challenge_xyz" in url
    assert "code_challenge_method=S256" in url
