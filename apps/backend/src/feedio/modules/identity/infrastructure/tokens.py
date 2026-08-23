from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.domain.models import AuthTokens, TokenClaims


class JwtTokenManager:
    def __init__(
        self,
        secret: str,
        issuer: str,
        access_ttl_seconds: int,
        refresh_ttl_seconds: int,
    ) -> None:
        self._secret = secret
        self._issuer = issuer
        self._access_ttl = access_ttl_seconds
        self._refresh_ttl = refresh_ttl_seconds

    def issue(self, user_id: UUID, session_id: UUID) -> AuthTokens:
        return AuthTokens(
            access_token=self._encode(user_id, session_id, "access", self._access_ttl),
            refresh_token=self._encode(user_id, session_id, "refresh", self._refresh_ttl),
            expires_in=self._access_ttl,
            refresh_expires_in=self._refresh_ttl,
        )

    def verify_access(self, token: str) -> TokenClaims:
        return self._decode(token, "access")

    def verify_refresh(self, token: str) -> TokenClaims:
        return self._decode(token, "refresh")

    def _encode(self, user_id: UUID, session_id: UUID, token_type: str, ttl: int) -> str:
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "sub": str(user_id),
                "sid": str(session_id),
                "jti": str(uuid4()),
                "typ": token_type,
                "iss": self._issuer,
                "iat": now,
                "exp": now + timedelta(seconds=ttl),
            },
            self._secret,
            algorithm="HS256",
        )

    def _decode(self, token: str, expected_type: str) -> TokenClaims:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                issuer=self._issuer,
                options={"require": ["sub", "sid", "jti", "typ", "iss", "iat", "exp"]},
            )
            if payload["typ"] != expected_type:
                raise InvalidAccessTokenError("Token type is invalid")
            return TokenClaims(
                user_id=UUID(payload["sub"]),
                session_id=UUID(payload["sid"]),
                token_id=UUID(payload["jti"]),
            )
        except InvalidAccessTokenError:
            raise
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
            raise InvalidAccessTokenError("Token is invalid") from error
