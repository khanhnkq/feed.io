import json

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.infrastructure.jwks import HttpJwksProvider


async def test_caches_keycloak_jwks_until_ttl_expires() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": "key-1", "use": "sig", "alg": "RS256"})
    request_count = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json={"keys": [jwk]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = HttpJwksProvider(
            client,
            "http://keycloak:8080/realms/feedio/protocol/openid-connect/certs",
            cache_ttl_seconds=300,
        )
        first = await provider.get_signing_key("key-1")
        second = await provider.get_signing_key("key-1")
        with pytest.raises(InvalidAccessTokenError):
            await provider.get_signing_key("attacker-controlled-key")

    assert first.public_numbers() == second.public_numbers()
    assert request_count == 1
