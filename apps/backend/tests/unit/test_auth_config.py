import pytest
from pydantic import ValidationError

from feedio.bootstrap.config import Settings


def test_production_rejects_development_auth_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            auth_cookie_secure=True,
            auth_jwt_secret="local-only-change-this-32-byte-secret",
        )


def test_production_requires_secure_cookies() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", auth_jwt_secret="a" * 96)
