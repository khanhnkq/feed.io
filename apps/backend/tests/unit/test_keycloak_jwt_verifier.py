from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from feedio.modules.identity.domain.errors import InvalidAccessTokenError
from feedio.modules.identity.infrastructure.jwt_verifier import KeycloakJwtVerifier

ISSUER = "http://localhost:8080/realms/feedio"
AUDIENCE = "feedio-api"


class StaticSigningKeyProvider:
    def __init__(self, public_key: rsa.RSAPublicKey) -> None:
        self.public_key = public_key

    async def get_signing_key(self, key_id: str) -> rsa.RSAPublicKey:
        assert key_id == "test-key"
        return self.public_key


def create_token(
    private_key: rsa.RSAPrivateKey,
    *,
    audience: str = AUDIENCE,
    expires_delta: timedelta = timedelta(minutes=5),
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "iss": ISSUER,
            "aud": audience,
            "sub": "keycloak-user-1",
            "email": "editor@agency.test",
            "name": "Agency Editor",
            "iat": now,
            "exp": now + expires_delta,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


async def test_verifies_keycloak_access_token_claims() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = KeycloakJwtVerifier(
        StaticSigningKeyProvider(private_key.public_key()),
        issuer=ISSUER,
        audience=AUDIENCE,
    )

    claims = await verifier.verify(create_token(private_key))

    assert claims.subject == "keycloak-user-1"
    assert claims.email == "editor@agency.test"
    assert claims.display_name == "Agency Editor"


@pytest.mark.parametrize(
    ("audience", "expires_delta"),
    [
        ("another-api", timedelta(minutes=5)),
        (AUDIENCE, timedelta(seconds=-1)),
    ],
)
async def test_rejects_wrong_audience_or_expired_token(
    audience: str,
    expires_delta: timedelta,
) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = KeycloakJwtVerifier(
        StaticSigningKeyProvider(private_key.public_key()),
        issuer=ISSUER,
        audience=AUDIENCE,
    )

    with pytest.raises(InvalidAccessTokenError):
        await verifier.verify(
            create_token(private_key, audience=audience, expires_delta=expires_delta)
        )
