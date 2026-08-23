import secrets
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from feedio.modules.identity.application.ports import AuthRepository, TokenManager
from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.identity.presentation.cookies import ACCESS_COOKIE, CSRF_COOKIE

TokenProvider = Callable[..., TokenManager | Awaitable[TokenManager]]
RepositoryProvider = Callable[..., AuthRepository | Awaitable[AuthRepository]]


def create_current_user_dependency(
    token_provider: TokenProvider,
    repository_provider: RepositoryProvider,
) -> Callable[..., Awaitable[CurrentUser]]:
    async def current_user(
        request: Request,
        tokens: Annotated[TokenManager, Depends(token_provider)],
        repository: Annotated[AuthRepository, Depends(repository_provider)],
        authorization: Annotated[str | None, Header()] = None,
    ) -> CurrentUser:
        access_token = _bearer_token(authorization) or request.cookies.get(ACCESS_COOKIE)
        if not access_token:
            raise _unauthorized("Access token is missing")
        try:
            claims = tokens.verify_access(access_token)
        except InvalidAccessTokenError as error:
            raise _unauthorized("Access token is invalid") from error
        user = await repository.current_user(claims.user_id)
        if user is None:
            raise _unauthorized("User is unavailable")
        return CurrentUser(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            email_verified=user.email_verified,
            has_workspace=user.has_workspace,
            session_id=claims.session_id,
        )

    return current_user


def require_csrf_for_cookie(
    request: Request,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> None:
    if ACCESS_COOKIE not in request.cookies and "feedio_refresh_token" not in request.cookies:
        return
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF validation failed")


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, separator, token = authorization.partition(" ")
    if separator and scheme.lower() == "bearer" and token.strip():
        return token.strip()
    return None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail,
        headers={"WWW-Authenticate": "Bearer"},
    )
