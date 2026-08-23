from typing import Protocol

from feedio.modules.identity.domain.models import CurrentUser, IdentityClaims, OidcTokens


class AccessTokenVerifier(Protocol):
    async def verify(self, access_token: str) -> IdentityClaims: ...


class IdentityRepository(Protocol):
    async def provision(self, claims: IdentityClaims) -> CurrentUser: ...


class OidcClient(Protocol):
    def authorization_url(self, state: str, code_challenge: str) -> str: ...

    async def exchange_code(self, code: str, code_verifier: str) -> OidcTokens: ...

    async def refresh(self, refresh_token: str) -> OidcTokens: ...

    async def revoke(self, token: str) -> None: ...
