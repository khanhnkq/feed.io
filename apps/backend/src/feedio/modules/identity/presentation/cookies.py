from dataclasses import dataclass
from typing import Literal

from fastapi import Response

from feedio.modules.identity.domain.value_objects import AuthTokens

ACCESS_COOKIE = "feedio_access_token"
REFRESH_COOKIE = "feedio_refresh_token"
CSRF_COOKIE = "feedio_csrf_token"
OAUTH_STATE_COOKIE = "feedio_oauth_state"
OAUTH_VERIFIER_COOKIE = "feedio_oauth_verifier"


@dataclass(frozen=True, slots=True)
class AuthCookieSettings:
    secure: bool
    same_site: Literal["lax", "strict", "none"] = "lax"
    domain: str | None = None


class AuthCookies:
    def __init__(self, settings: AuthCookieSettings) -> None:
        self._settings = settings

    def set_tokens(self, response: Response, tokens: AuthTokens, csrf_token: str) -> None:
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

    def set_oauth_state(
        self,
        response: Response,
        *,
        state: str,
        code_verifier: str,
        max_age: int = 600,
    ) -> None:
        self._set(
            response,
            OAUTH_STATE_COOKIE,
            state,
            max_age=max_age,
            path="/api/v1/auth",
            http_only=True,
        )
        self._set(
            response,
            OAUTH_VERIFIER_COOKIE,
            code_verifier,
            max_age=max_age,
            path="/api/v1/auth",
            http_only=True,
        )

    def clear_oauth_state(self, response: Response) -> None:
        response.delete_cookie(OAUTH_STATE_COOKIE, path="/api/v1/auth", domain=self._settings.domain)
        response.delete_cookie(OAUTH_VERIFIER_COOKIE, path="/api/v1/auth", domain=self._settings.domain)

    def clear_tokens(self, response: Response) -> None:
        response.delete_cookie(ACCESS_COOKIE, path="/api", domain=self._settings.domain)
        response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth", domain=self._settings.domain)
        response.delete_cookie(CSRF_COOKIE, path="/", domain=self._settings.domain)

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
            domain=self._settings.domain,
            secure=self._settings.secure,
            httponly=http_only,
            samesite=self._settings.same_site,
        )
