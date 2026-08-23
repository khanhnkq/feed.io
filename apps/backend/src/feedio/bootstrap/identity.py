import httpx

from feedio.bootstrap.config import Settings
from feedio.modules.identity.application.ports import AccessTokenVerifier, OidcClient
from feedio.modules.identity.infrastructure.jwks import HttpJwksProvider
from feedio.modules.identity.infrastructure.jwt_verifier import KeycloakJwtVerifier
from feedio.modules.identity.infrastructure.oidc_client import KeycloakOidcClient


class IdentityServices:
    def __init__(self, settings: Settings) -> None:
        self._http_client = httpx.AsyncClient(timeout=settings.dependency_timeout_seconds)
        signing_keys = HttpJwksProvider(
            self._http_client,
            f"{settings.keycloak_internal_issuer}/protocol/openid-connect/certs",
            cache_ttl_seconds=settings.keycloak_jwks_cache_ttl_seconds,
        )
        self._verifier = KeycloakJwtVerifier(
            signing_keys,
            issuer=settings.keycloak_public_issuer,
            audience=settings.keycloak_audience,
        )
        self._oidc_client = KeycloakOidcClient(
            http_client=self._http_client,
            public_issuer=settings.keycloak_public_issuer,
            internal_issuer=settings.keycloak_internal_issuer,
            client_id=settings.keycloak_client_id,
            client_secret=settings.keycloak_client_secret,
            redirect_uri=settings.keycloak_redirect_uri,
        )

    def provide_verifier(self) -> AccessTokenVerifier:
        return self._verifier

    def provide_oidc_client(self) -> OidcClient:
        return self._oidc_client

    async def close(self) -> None:
        await self._http_client.aclose()
