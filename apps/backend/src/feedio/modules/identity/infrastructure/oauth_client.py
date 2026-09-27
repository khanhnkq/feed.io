from urllib.parse import urlencode

import httpx

from feedio.modules.identity.domain.entities import GoogleUserInfo
from feedio.modules.identity.domain.errors import OAuthAuthenticationError


class GoogleOAuthClient:
    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._redirect_uri = redirect_uri

    def get_authorization_url(self, *, state: str, code_challenge: str) -> str:
        params = {
            "client_id": self._client_id,
            "redirect_uri": self._redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "online",
            "prompt": "select_account",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    async def exchange_code(self, *, code: str, code_verifier: str) -> GoogleUserInfo:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "code": code,
                    "code_verifier": code_verifier,
                    "grant_type": "authorization_code",
                    "redirect_uri": self._redirect_uri,
                },
            )
            if response.status_code != 200:
                raise OAuthAuthenticationError(
                    f"Failed to exchange OAuth code with Google: {response.text}"
                )

            token_data = response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise OAuthAuthenticationError("Missing access_token in Google response")

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                raise OAuthAuthenticationError(
                    f"Failed to fetch Google userinfo: {userinfo_resp.text}"
                )

            userinfo = userinfo_resp.json()
            return GoogleUserInfo(
                sub=str(userinfo["sub"]),
                email=str(userinfo["email"]),
                email_verified=bool(userinfo.get("email_verified", False)),
                name=userinfo.get("name"),
                picture=userinfo.get("picture"),
            )
