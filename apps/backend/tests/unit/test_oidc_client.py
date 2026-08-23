from urllib.parse import parse_qs, urlparse

import httpx

from feedio.modules.identity.infrastructure.oidc_client import KeycloakOidcClient


def build_client(handler: httpx.MockTransport) -> KeycloakOidcClient:
    return KeycloakOidcClient(
        http_client=httpx.AsyncClient(transport=handler),
        public_issuer="http://localhost:8080/realms/feedio",
        internal_issuer="http://keycloak:8080/realms/feedio",
        client_id="feedio-web",
        client_secret="client-secret",
        redirect_uri="http://localhost:8088/api/v1/auth/callback",
    )


async def test_builds_authorization_code_url_with_pkce_s256() -> None:
    client = build_client(httpx.MockTransport(lambda _: httpx.Response(500)))

    url = client.authorization_url(state="state-1", code_challenge="challenge-1")
    query = parse_qs(urlparse(url).query)

    assert query["response_type"] == ["code"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["scope"] == ["openid profile email"]


async def test_refreshes_and_revokes_rotated_refresh_token() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/token"):
            return httpx.Response(
                200,
                json={
                    "access_token": "access-2",
                    "refresh_token": "refresh-2",
                    "expires_in": 300,
                    "refresh_expires_in": 1800,
                },
            )
        return httpx.Response(200)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = KeycloakOidcClient(
            http_client=http_client,
            public_issuer="http://localhost:8080/realms/feedio",
            internal_issuer="http://keycloak:8080/realms/feedio",
            client_id="feedio-web",
            client_secret="client-secret",
            redirect_uri="http://localhost:8088/api/v1/auth/callback",
        )
        tokens = await client.refresh("refresh-1")
        await client.revoke("refresh-2")

    assert tokens.refresh_token == "refresh-2"
    assert "grant_type=refresh_token" in requests[0].content.decode()
    assert "token=refresh-2" in requests[1].content.decode()
    assert requests[0].headers["authorization"].startswith("Basic ")
