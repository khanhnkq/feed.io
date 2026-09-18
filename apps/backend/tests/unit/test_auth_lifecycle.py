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
from feedio.modules.identity.domain.entities import SessionView, UserRecord
from feedio.modules.identity.domain.errors import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    UserDisabledError,
)
from feedio.modules.identity.domain.value_objects import AuthTokens, CurrentUser, PlatformRole, TokenClaims


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
            expires_in=900,
            refresh_expires_in=86400,
        )

    def verify_access(self, token: str) -> TokenClaims:
        return TokenClaims(user_id=uuid4(), session_id=uuid4(), token_id=uuid4())

    def verify_refresh(self, token: str) -> TokenClaims:
        return TokenClaims(user_id=uuid4(), session_id=uuid4(), token_id=uuid4())


class FakeAuthMailer(AuthMailer):
    def __init__(self) -> None:
        self.sent_verifications: list[tuple[str, str, str | None]] = []

    async def send_verification(self, email: str, token: str, display_name: str | None = None) -> None:
        self.sent_verifications.append((email, token, display_name))

    async def send_password_reset(self, email: str, token: str, display_name: str | None = None) -> None:
        pass


class FakeAuthRepository(AuthRepository):
    def __init__(self) -> None:
        self.users: dict[str, UserRecord] = {}
        self.users_by_id: dict[UUID, UserRecord] = {}

    async def find_user_by_email(self, email: str) -> UserRecord | None:
        return self.users.get(email.strip().lower())

    async def find_user_by_id(self, user_id: UUID) -> UserRecord | None:
        return self.users_by_id.get(user_id)

    async def create_pending_user(self, *, email: str, password_hash: str) -> UserRecord:
        user = UserRecord(
            id=uuid4(),
            email=email,
            password_hash=password_hash,
            status="active",
            email_verified_at=None,
            platform_role=PlatformRole.USER,
        )
        self.users[email] = user
        self.users_by_id[user.id] = user
        return user

    async def replace_action_token(self, **kwargs) -> None:
        pass

    async def verify_email(self, token_hash: str) -> None:
        pass

    async def reset_password(self, token_hash: str, password_hash: str) -> None:
        pass

    async def create_session(self, **kwargs) -> None:
        pass

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
        pass

    async def revoke_other_sessions(self, user_id: UUID, current_session_id: UUID) -> None:
        pass


@pytest.fixture
def auth_components() -> tuple[AuthService, FakeAuthRepository, FakeAuthMailer]:
    repo = FakeAuthRepository()
    mailer = FakeAuthMailer()
    service = AuthService(
        repository=repo,
        passwords=FakePasswordManager(),
        tokens=FakeTokenManager(),
        mailer=mailer,
        refresh_ttl_seconds=86400,
    )
    return service, repo, mailer


@pytest.mark.asyncio
async def test_register_creates_unverified_active_user(
    auth_components: tuple[AuthService, FakeAuthRepository, FakeAuthMailer],
) -> None:
    service, repo, mailer = auth_components
    await service.register(
        email="newuser@example.com",
        password="ValidPassword123!",
        display_name="New Creative",
    )

    user = await repo.find_user_by_email("newuser@example.com")
    assert user is not None
    assert user.status == "active"
    assert user.email_verified_at is None
    assert len(mailer.sent_verifications) == 1
    assert mailer.sent_verifications[0][0] == "newuser@example.com"


@pytest.mark.asyncio
async def test_login_fails_when_unverified(
    auth_components: tuple[AuthService, FakeAuthRepository, FakeAuthMailer],
) -> None:
    service, repo, _ = auth_components
    user = UserRecord(
        id=uuid4(),
        email="unverified@example.com",
        password_hash="hashed_Secret123!",
        status="active",
        email_verified_at=None,
    )
    repo.users[user.email] = user
    repo.users_by_id[user.id] = user

    with pytest.raises(EmailNotVerifiedError):
        await service.login(email="unverified@example.com", password="Secret123!")


@pytest.mark.asyncio
async def test_login_fails_when_disabled(
    auth_components: tuple[AuthService, FakeAuthRepository, FakeAuthMailer],
) -> None:
    service, repo, _ = auth_components
    user = UserRecord(
        id=uuid4(),
        email="blocked@example.com",
        password_hash="hashed_Secret123!",
        status="disabled",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[user.email] = user
    repo.users_by_id[user.id] = user

    with pytest.raises(UserDisabledError):
        await service.login(email="blocked@example.com", password="Secret123!")


@pytest.mark.asyncio
async def test_login_succeeds_when_active_and_verified(
    auth_components: tuple[AuthService, FakeAuthRepository, FakeAuthMailer],
) -> None:
    service, repo, _ = auth_components
    user = UserRecord(
        id=uuid4(),
        email="verified@example.com",
        password_hash="hashed_Secret123!",
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    repo.users[user.email] = user
    repo.users_by_id[user.id] = user

    tokens = await service.login(email="verified@example.com", password="Secret123!")
    assert tokens.access_token == f"access_{user.id}"
    assert tokens.refresh_token == f"refresh_{user.id}"
