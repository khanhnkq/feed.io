import asyncio
from time import monotonic
from typing import cast

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

from feedio.modules.identity.domain.errors import InvalidAccessTokenError


class HttpJwksProvider:
    def __init__(
        self,
        http_client: httpx.AsyncClient,
        jwks_url: str,
        *,
        cache_ttl_seconds: int,
    ) -> None:
        self._http_client = http_client
        self._jwks_url = jwks_url
        self._cache_ttl_seconds = cache_ttl_seconds
        self._keys: dict[str, RSAPublicKey] = {}
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def get_signing_key(self, key_id: str) -> RSAPublicKey:
        if monotonic() < self._expires_at:
            return self._get_cached_key(key_id)
        async with self._lock:
            if monotonic() >= self._expires_at:
                await self._refresh()
            return self._get_cached_key(key_id)

    async def _refresh(self) -> None:
        try:
            response = await self._http_client.get(self._jwks_url)
            response.raise_for_status()
            jwk_set = jwt.PyJWKSet.from_dict(response.json())
            keys = {
                key.key_id: cast(RSAPublicKey, key.key)
                for key in jwk_set.keys
                if key.key_id
                and key.public_key_use in {None, "sig"}
                and key.algorithm_name == "RS256"
            }
        except (httpx.HTTPError, jwt.PyJWTError, TypeError, ValueError) as error:
            raise InvalidAccessTokenError("Unable to load JWT signing keys") from error
        self._keys = keys
        self._expires_at = monotonic() + self._cache_ttl_seconds

    def _get_cached_key(self, key_id: str) -> RSAPublicKey:
        try:
            return self._keys[key_id]
        except KeyError as error:
            raise InvalidAccessTokenError("JWT signing key is unknown") from error
