import secrets
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from feedio.modules.identity.application.ports import AccessTokenVerifier, IdentityRepository
from feedio.modules.identity.domain.errors import InvalidAccessTokenError, UserDisabledError
from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.identity.presentation.cookies import ACCESS_COOKIE, CSRF_COOKIE

VerifierProvider = Callable[..., AccessTokenVerifier | Awaitable[AccessTokenVerifier]]
RepositoryProvider = Callable[..., IdentityRepository | Awaitable[IdentityRepository]]


def create_current_user_dependency(
    verifier_provider: VerifierProvider,
    identity_repository_provider: RepositoryProvider,
) -> Callable[..., Awaitable[CurrentUser]]:
    async def current_user(
        request: Request,
        verifier: Annotated[AccessTokenVerifier, Depends(verifier_provider)],
        repository: Annotated[IdentityRepository, Depends(identity_repository_provider)],
        authorization: Annotated[str | None, Header()] = None,
    ) -> CurrentUser:
        access_token = _bearer_token(authorization) or request.cookies.get(ACCESS_COOKIE)
        if not access_token:
            raise _unauthorized("Access token is missing")
        try:
            claims = await verifier.verify(access_token)
            return await repository.provision(claims)
        except InvalidAccessTokenError as error:
            raise _unauthorized("Access token is invalid") from error
        except UserDisabledError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "User is disabled") from error

    return current_user


def require_csrf_for_cookie(
    request: Request,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> None:
    if ACCESS_COOKIE not in request.cookies:
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
