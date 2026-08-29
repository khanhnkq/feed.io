from dataclasses import dataclass
from typing import Literal

from fastapi import Response

from feedio.modules.identity.domain.value_objects import AuthTokens

ACCESS_COOKIE = "feedio_access_token"
REFRESH_COOKIE = "feedio_refresh_token"
CSRF_COOKIE = "feedio_csrf_token"


@dataclass(frozen=True, slots=True)
class AuthCookieSettings:
    secure: bool
    same_site: Literal["lax", "strict", "none"] = "lax"


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
