from typing import Protocol

import jwt
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.domain.models import IdentityClaims


class SigningKeyProvider(Protocol):
    async def get_signing_key(self, key_id: str) -> RSAPublicKey: ...


class KeycloakJwtVerifier:
    def __init__(
        self,
        signing_keys: SigningKeyProvider,
        *,
        issuer: str,
        audience: str,
    ) -> None:
        self._signing_keys = signing_keys
        self._issuer = issuer.rstrip("/")
        self._audience = audience

    async def verify(self, access_token: str) -> IdentityClaims:
        try:
            header = jwt.get_unverified_header(access_token)
            key_id = self._required_string(header, "kid")
            signing_key = await self._signing_keys.get_signing_key(key_id)
            payload = jwt.decode(
                access_token,
                signing_key,
                algorithms=["RS256"],
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["aud", "exp", "iat", "iss", "sub"]},
            )
            subject = self._required_string(payload, "sub")
            email = self._required_string(payload, "email")
            display_name = self._display_name(payload, email)
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
            raise InvalidAccessTokenError("Access token is invalid") from error
        return IdentityClaims(subject=subject, email=email, display_name=display_name)

    @staticmethod
    def _required_string(values: dict[str, object], key: str) -> str:
        value = values[key]
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Missing required string claim: {key}")
        return value.strip()

    @classmethod
    def _display_name(cls, payload: dict[str, object], email: str) -> str:
        for key in ("name", "preferred_username"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:120]
        return email[:120]
