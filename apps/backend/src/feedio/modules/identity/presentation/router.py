import base64
import hashlib
import secrets
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from feedio.modules.identity.application.ports import (
    AccessTokenVerifier,
    IdentityRepository,
    OidcClient,
)
from feedio.modules.identity.domain.errors import (
    IdentityProviderError,
    InvalidAccessTokenError,
    UserDisabledError,
)
from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.identity.presentation.cookies import (
    CSRF_COOKIE,
    FLOW_STATE_COOKIE,
    FLOW_VERIFIER_COOKIE,
    REFRESH_COOKIE,
    AuthCookies,
    AuthCookieSettings,
)
from feedio.modules.identity.presentation.dependencies import create_current_user_dependency
from feedio.modules.identity.presentation.schemas import CurrentUserResponse

OidcProvider = Callable[..., OidcClient | Awaitable[OidcClient]]
VerifierProvider = Callable[..., AccessTokenVerifier | Awaitable[AccessTokenVerifier]]
RepositoryProvider = Callable[..., IdentityRepository | Awaitable[IdentityRepository]]


def create_auth_router(
    *,
    oidc_provider: OidcProvider,
    verifier_provider: VerifierProvider,
    identity_repository_provider: RepositoryProvider,
    cookie_settings: AuthCookieSettings,
    success_url: str,
) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["authentication"])
    cookies = AuthCookies(cookie_settings)
    current_user_dependency = create_current_user_dependency(
        verifier_provider,
        identity_repository_provider,
    )

    @router.get("/login", operation_id="login")
    async def login(oidc: Annotated[OidcClient, Depends(oidc_provider)]) -> Response:
        state = secrets.token_urlsafe(32)
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = _pkce_challenge(code_verifier)
        response = RedirectResponse(oidc.authorization_url(state, code_challenge))
        cookies.set_flow(response, state=state, code_verifier=code_verifier)
        return response

    @router.get("/callback", operation_id="oidc_callback")
    async def callback(
        request: Request,
        code: Annotated[str, Query(min_length=1)],
        state_value: Annotated[str, Query(alias="state", min_length=1)],
        oidc: Annotated[OidcClient, Depends(oidc_provider)],
        verifier: Annotated[AccessTokenVerifier, Depends(verifier_provider)],
        repository: Annotated[IdentityRepository, Depends(identity_repository_provider)],
    ) -> Response:
        expected_state = request.cookies.get(FLOW_STATE_COOKIE)
        code_verifier = request.cookies.get(FLOW_VERIFIER_COOKIE)
        if not expected_state or not code_verifier or not secrets.compare_digest(
            expected_state, state_value
        ):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "OIDC state is invalid")
        try:
            tokens = await oidc.exchange_code(code, code_verifier)
            claims = await verifier.verify(tokens.access_token)
            await repository.provision(claims)
        except InvalidAccessTokenError as error:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access token is invalid") from error
        except IdentityProviderError as error:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Identity provider unavailable",
            ) from error
        except UserDisabledError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "User is disabled") from error
        response = RedirectResponse(success_url)
        cookies.clear_flow(response)
        cookies.set_tokens(response, tokens, secrets.token_urlsafe(32))
        return response

    @router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT, operation_id="refresh_token")
    async def refresh(
        request: Request,
        oidc: Annotated[OidcClient, Depends(oidc_provider)],
        verifier: Annotated[AccessTokenVerifier, Depends(verifier_provider)],
        repository: Annotated[IdentityRepository, Depends(identity_repository_provider)],
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> Response:
        _require_csrf(request, csrf_header)
        refresh_token = request.cookies.get(REFRESH_COOKIE)
        if not refresh_token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is missing")
        try:
            tokens = await oidc.refresh(refresh_token)
            claims = await verifier.verify(tokens.access_token)
            await repository.provision(claims)
        except (IdentityProviderError, InvalidAccessTokenError, UserDisabledError):
            response = Response(status_code=status.HTTP_401_UNAUTHORIZED)
            cookies.clear_tokens(response)
            return response
        response = Response(status_code=status.HTTP_204_NO_CONTENT)
        cookies.set_tokens(response, tokens, secrets.token_urlsafe(32))
        return response

    @router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, operation_id="logout")
    async def logout(
        request: Request,
        oidc: Annotated[OidcClient, Depends(oidc_provider)],
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> Response:
        _require_csrf(request, csrf_header)
        refresh_token = request.cookies.get(REFRESH_COOKIE)
        provider_failed = False
        if refresh_token:
            try:
                await oidc.revoke(refresh_token)
            except IdentityProviderError:
                provider_failed = True
        response = Response(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
                if provider_failed
                else status.HTTP_204_NO_CONTENT
            )
        )
        cookies.clear_tokens(response)
        return response

    @router.get("/me", operation_id="get_current_user")
    async def get_current_user(
        current_user: Annotated[CurrentUser, Depends(current_user_dependency)],
    ) -> CurrentUserResponse:
        return CurrentUserResponse.from_domain(current_user)

    return router


def _pkce_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def _require_csrf(request: Request, csrf_header: str | None) -> None:
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF validation failed")
