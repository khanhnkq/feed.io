from urllib.parse import urlencode

import httpx

from feedio.modules.identity.domain.errors import IdentityProviderError
from feedio.modules.identity.domain.models import OidcTokens


class KeycloakOidcClient:
    def __init__(
        self,
        *,
        http_client: httpx.AsyncClient,
        public_issuer: str,
        internal_issuer: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ) -> None:
        self._http_client = http_client
        self._public_issuer = public_issuer.rstrip("/")
        self._internal_issuer = internal_issuer.rstrip("/")
        self._client_id = client_id
        self._client_secret = client_secret
        self._redirect_uri = redirect_uri

    def authorization_url(self, state: str, code_challenge: str) -> str:
        query = urlencode(
            {
                "client_id": self._client_id,
                "redirect_uri": self._redirect_uri,
                "response_type": "code",
                "scope": "openid profile email",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{self._public_issuer}/protocol/openid-connect/auth?{query}"

    async def exchange_code(self, code: str, code_verifier: str) -> OidcTokens:
        return await self._request_tokens(
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self._redirect_uri,
                "code_verifier": code_verifier,
            }
        )

    async def refresh(self, refresh_token: str) -> OidcTokens:
        return await self._request_tokens(
            {"grant_type": "refresh_token", "refresh_token": refresh_token}
        )

    async def revoke(self, token: str) -> None:
        response = await self._http_client.post(
            f"{self._internal_issuer}/protocol/openid-connect/revoke",
            data={"token": token, "token_type_hint": "refresh_token"},
            auth=(self._client_id, self._client_secret),
        )
        try:
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise IdentityProviderError("Keycloak token revocation failed") from error

    async def _request_tokens(self, data: dict[str, str]) -> OidcTokens:
        response = await self._http_client.post(
            f"{self._internal_issuer}/protocol/openid-connect/token",
            data=data,
            auth=(self._client_id, self._client_secret),
        )
        try:
            response.raise_for_status()
            payload = response.json()
            tokens = OidcTokens(
                access_token=self._required_string(payload, "access_token"),
                refresh_token=self._required_string(payload, "refresh_token"),
                expires_in=int(payload["expires_in"]),
                refresh_expires_in=int(payload["refresh_expires_in"]),
            )
            if tokens.expires_in <= 0 or tokens.refresh_expires_in <= 0:
                raise ValueError("Token lifetimes must be positive")
            return tokens
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise IdentityProviderError("Keycloak token request failed") from error

    @staticmethod
    def _required_string(payload: dict[str, object], key: str) -> str:
        value = payload[key]
        if not isinstance(value, str) or not value:
            raise ValueError(f"Missing token response field: {key}")
        return value
