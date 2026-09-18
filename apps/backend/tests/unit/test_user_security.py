from uuid import UUID, uuid4

import pytest

from feedio.modules.identity.application.ports import (
    AuthRepository,
    PasswordManager,
)
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.domain.entities import SessionView, UserRecord
from feedio.modules.identity.domain.errors import InvalidCurrentPasswordError
from feedio.modules.identity.domain.value_objects import CurrentUser


class FakePasswordManager(PasswordManager):
    def hash(self, password: str) -> str:
        return f"hashed_{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == f"hashed_{password}"


class FakeAuthRepository(AuthRepository):
    def __init__(self) -> None:
        self.passwords: dict[UUID, str] = {}
        self.revoked_sessions: list[UUID] = []

    async def get_password_hash(self, user_id: UUID) -> str | None:
        return self.passwords.get(user_id)

    async def update_password_hash(self, user_id: UUID, new_hash: str) -> None:
        self.passwords[user_id] = new_hash

    async def revoke_other_sessions(self, user_id: UUID, current_session_id: UUID) -> None:
        self.revoked_sessions.append(current_session_id)

    async def find_user_by_email(self, email: str) -> UserRecord | None:
        return None

    async def find_user_by_id(self, user_id: UUID) -> UserRecord | None:
        return None

    async def create_pending_user(self, **kwargs) -> UserRecord:
        raise NotImplementedError

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


@pytest.fixture
def test_user_id() -> UUID:
    return uuid4()


@pytest.fixture
def auth_repo(test_user_id: UUID) -> FakeAuthRepository:
    repo = FakeAuthRepository()
    repo.passwords[test_user_id] = "hashed_OldP@ssword123!"
    return repo


@pytest.fixture
def auth_service(auth_repo: FakeAuthRepository) -> AuthService:
    return AuthService(
        repository=auth_repo,
        passwords=FakePasswordManager(),
        tokens=None,  # type: ignore[arg-type]
        mailer=None,  # type: ignore[arg-type]
        refresh_ttl_seconds=86400,
    )


async def test_change_password_success(
    auth_service: AuthService,
    auth_repo: FakeAuthRepository,
    test_user_id: UUID,
) -> None:
    session_id = uuid4()
    await auth_service.change_password(
        user_id=test_user_id,
        current_password="OldP@ssword123!",
        new_password="NewP@ssword456!",
        current_session_id=session_id,
        revoke_other_sessions=True,
    )
    assert auth_repo.passwords[test_user_id] == "hashed_NewP@ssword456!"
    assert session_id in auth_repo.revoked_sessions


async def test_change_password_invalid_current(
    auth_service: AuthService,
    test_user_id: UUID,
) -> None:
    with pytest.raises(InvalidCurrentPasswordError):
        await auth_service.change_password(
            user_id=test_user_id,
            current_password="WrongPassword123!",
            new_password="NewP@ssword456!",
        )
