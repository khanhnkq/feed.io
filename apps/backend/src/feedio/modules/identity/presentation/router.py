import secrets
from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status

from feedio.shared.presentation.pagination import PaginatedResponse
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.domain.errors import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidAccessTokenError,
    InvalidActionTokenError,
    InvalidCredentialsError,
    RefreshTokenReuseError,
    UserDisabledError,
)
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.cookies import (
    CSRF_COOKIE,
    REFRESH_COOKIE,
    AuthCookies,
    AuthCookieSettings,
)
from feedio.modules.identity.presentation.schemas import (
    ActionTokenRequest,
    CurrentUserResponse,
    EmailRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionResponse,
)

AuthServiceProvider = Callable[..., AuthService | Awaitable[AuthService]]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]


def create_auth_router(
    *,
    auth_service_provider: AuthServiceProvider,
    current_user_provider: CurrentUserProvider,
    cookie_settings: AuthCookieSettings,
) -> APIRouter:
    router = APIRouter(prefix="/auth")
    cookies = AuthCookies(cookie_settings)

    @router.post(
        "/register",
        status_code=status.HTTP_202_ACCEPTED,
        operation_id="register",
        tags=["auth-registration"],
    )
    async def register(
        body: RegisterRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> None:
        try:
            await service.register(**body.model_dump(mode="python"))
        except EmailAlreadyRegisteredError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    @router.post(
        "/verify-email",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="verify_email",
        tags=["auth-registration"],
    )
    async def verify_email(
        body: ActionTokenRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> None:
        try:
            await service.verify_email(body.token)
        except InvalidActionTokenError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.post(
        "/resend-verification",
        status_code=status.HTTP_202_ACCEPTED,
        operation_id="resend_verification",
        tags=["auth-registration"],
    )
    async def resend_verification(
        body: EmailRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> None:
        await service.resend_verification(str(body.email))

    @router.post(
        "/login",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="login",
        tags=["auth-session"],
    )
    async def login(
        body: LoginRequest,
        request: Request,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> Response:
        try:
            tokens = await service.login(
                email=str(body.email),
                password=body.password,
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None,
            )
        except InvalidCredentialsError as error:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(error)) from error
        except EmailNotVerifiedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        except UserDisabledError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
        response = Response(status_code=status.HTTP_204_NO_CONTENT)
        cookies.set_tokens(response, tokens, secrets.token_urlsafe(32))
        return response

    @router.post(
        "/refresh",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="refresh_token",
        tags=["auth-session"],
    )
    async def refresh(
        request: Request,
        service: Annotated[AuthService, Depends(auth_service_provider)],
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> Response:
        _require_csrf(request, csrf_header)
        refresh_token = request.cookies.get(REFRESH_COOKIE)
        if not refresh_token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is missing")
        try:
            tokens = await service.refresh(refresh_token)
        except (InvalidAccessTokenError, RefreshTokenReuseError):
            response = Response(status_code=status.HTTP_401_UNAUTHORIZED)
            cookies.clear_tokens(response)
            return response
        response = Response(status_code=status.HTTP_204_NO_CONTENT)
        cookies.set_tokens(response, tokens, secrets.token_urlsafe(32))
        return response

    @router.post(
        "/logout",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="logout",
        tags=["auth-session"],
    )
    async def logout(
        request: Request,
        service: Annotated[AuthService, Depends(auth_service_provider)],
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> Response:
        _require_csrf(request, csrf_header)
        await service.logout(request.cookies.get(REFRESH_COOKIE))
        response = Response(status_code=status.HTTP_204_NO_CONTENT)
        cookies.clear_tokens(response)
        return response

    @router.post(
        "/forgot-password",
        status_code=status.HTTP_202_ACCEPTED,
        operation_id="forgot_password",
        tags=["auth-recovery"],
    )
    async def forgot_password(
        body: EmailRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> None:
        await service.forgot_password(str(body.email))

    @router.post(
        "/reset-password",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="reset_password",
        tags=["auth-recovery"],
    )
    async def reset_password(
        body: ResetPasswordRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
    ) -> None:
        try:
            await service.reset_password(body.token, body.new_password)
        except InvalidActionTokenError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.get(
        "/me",
        operation_id="get_current_user",
        tags=["auth-user"],
    )
    async def get_current_user(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> CurrentUserResponse:
        return CurrentUserResponse.from_domain(current_user)

    @router.get(
        "/sessions",
        operation_id="list_sessions",
        tags=["auth-session"],
    )
    async def list_sessions(
        service: Annotated[AuthService, Depends(auth_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[SessionResponse]:
        sessions = await service.list_sessions(current_user.id)
        items = [
            SessionResponse(
                id=session.id,
                user_agent=session.user_agent,
                ip_address=session.ip_address,
                current=session.id == current_user.session_id,
            )
            for session in sessions
        ]
        return PaginatedResponse(items=items, next_cursor=None, has_more=False)

    @router.delete(
        "/sessions/{session_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="revoke_session",
        tags=["auth-session"],
    )
    async def revoke_session(
        session_id: UUID,
        request: Request,
        service: Annotated[AuthService, Depends(auth_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> None:
        _require_csrf(request, csrf_header)
        await service.revoke_session(current_user.id, session_id)

    return router


def _require_csrf(request: Request, csrf_header: str | None) -> None:
    if "feedio_access_token" not in request.cookies and REFRESH_COOKIE not in request.cookies:
        return
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF validation failed")
