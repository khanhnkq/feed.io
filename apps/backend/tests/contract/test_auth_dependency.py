from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI
from starlette.testclient import TestClient

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.domain.models import CurrentUser, IdentityClaims
from feedio.modules.identity.presentation.dependencies import create_current_user_dependency


class FakeVerifier:
    async def verify(self, access_token: str) -> IdentityClaims:
        if access_token == "invalid":
            raise InvalidAccessTokenError("invalid")
        return IdentityClaims("subject-1", "member@agency.test", "Agency Member")


class FakeRepository:
    async def provision(self, claims: IdentityClaims) -> CurrentUser:
        return CurrentUser(uuid4(), claims.subject, claims.email, claims.display_name)


def create_client() -> TestClient:
    async def provide_verifier() -> FakeVerifier:
        return FakeVerifier()

    async def provide_repository() -> FakeRepository:
        return FakeRepository()

    current_user = create_current_user_dependency(provide_verifier, provide_repository)
    app = FastAPI()

    @app.get("/protected")
    async def protected(
        user: Annotated[CurrentUser, Depends(current_user)],
    ) -> dict[str, str]:
        return {"subject": user.subject}

    return TestClient(app)


def test_accepts_http_only_access_token_cookie() -> None:
    client = create_client()
    client.cookies.set("feedio_access_token", "access-1")

    response = client.get("/protected")

    assert response.status_code == 200
    assert response.json() == {"subject": "subject-1"}


def test_rejects_missing_or_invalid_access_token() -> None:
    client = create_client()

    missing = client.get("/protected")
    client.cookies.set("feedio_access_token", "invalid")
    invalid = client.get("/protected")

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert invalid.headers["www-authenticate"] == "Bearer"
