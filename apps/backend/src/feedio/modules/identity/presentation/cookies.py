from dataclasses import dataclass
from typing import Literal

from fastapi import Response

from feedio.modules.identity.domain.models import OidcTokens

ACCESS_COOKIE = "feedio_access_token"
REFRESH_COOKIE = "feedio_refresh_token"
CSRF_COOKIE = "feedio_csrf_token"
FLOW_STATE_COOKIE = "feedio_login_state"
FLOW_VERIFIER_COOKIE = "feedio_code_verifier"


@dataclass(frozen=True, slots=True)
class AuthCookieSettings:
    secure: bool
    same_site: Literal["lax", "strict", "none"] = "lax"


class AuthCookies:
    def __init__(self, settings: AuthCookieSettings) -> None:
        self._settings = settings

    def set_flow(self, response: Response, *, state: str, code_verifier: str) -> None:
        self._set(
            response,
            FLOW_STATE_COOKIE,
            state,
            max_age=300,
            path="/api/v1/auth/callback",
            http_only=True,
        )
        self._set(
            response,
            FLOW_VERIFIER_COOKIE,
            code_verifier,
            max_age=300,
            path="/api/v1/auth/callback",
            http_only=True,
        )

    def clear_flow(self, response: Response) -> None:
        response.delete_cookie(FLOW_STATE_COOKIE, path="/api/v1/auth/callback")
        response.delete_cookie(FLOW_VERIFIER_COOKIE, path="/api/v1/auth/callback")

    def set_tokens(self, response: Response, tokens: OidcTokens, csrf_token: str) -> None:
        self._set(
            response,
            ACCESS_COOKIE,
            tokens.access_token,
            max_age=tokens.expires_in,
            path="/api",
            http_only=True,
        )
        self._set(
            response,
            REFRESH_COOKIE,
            tokens.refresh_token,
            max_age=tokens.refresh_expires_in,
            path="/api/v1/auth",
            http_only=True,
        )
        self._set(
            response,
            CSRF_COOKIE,
            csrf_token,
            max_age=tokens.refresh_expires_in,
            path="/",
            http_only=False,
        )

    def clear_tokens(self, response: Response) -> None:
        response.delete_cookie(ACCESS_COOKIE, path="/api")
        response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
        response.delete_cookie(CSRF_COOKIE, path="/")

    def _set(
        self,
        response: Response,
        name: str,
        value: str,
        *,
        max_age: int,
        path: str,
        http_only: bool,
    ) -> None:
        response.set_cookie(
            name,
            value,
            max_age=max(1, max_age),
            path=path,
            secure=self._settings.secure,
            httponly=http_only,
            samesite=self._settings.same_site,
        )
