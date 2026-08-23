from uuid import uuid4

import pytest

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.infrastructure.tokens import JwtTokenManager


def test_access_token_rejects_refresh_token() -> None:
    manager = JwtTokenManager("test-secret-that-is-long-enough-for-hmac", "feedio", 300, 3600)
    tokens = manager.issue(uuid4(), uuid4())

    with pytest.raises(InvalidAccessTokenError):
        manager.verify_access(tokens.refresh_token)


def test_refresh_rotation_changes_the_token() -> None:
    manager = JwtTokenManager("test-secret-that-is-long-enough-for-hmac", "feedio", 300, 3600)
    user_id = uuid4()
    session_id = uuid4()

    first = manager.issue(user_id, session_id)
    second = manager.issue(user_id, session_id)

    assert first.refresh_token != second.refresh_token
