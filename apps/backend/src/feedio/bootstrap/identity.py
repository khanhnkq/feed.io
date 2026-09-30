from feedio.bootstrap.config import Settings
from feedio.modules.identity.application.ports import (
    AuthMailer,
    OAuthClient,
    PasswordManager,
    TokenManager,
)
from feedio.modules.identity.infrastructure.mailer import SmtpAuthMailer
from feedio.modules.identity.infrastructure.oauth_client import GoogleOAuthClient
from feedio.modules.identity.infrastructure.passwords import Argon2PasswordManager
from feedio.modules.identity.infrastructure.tokens import JwtTokenManager


class IdentityServices:
    def __init__(self, settings: Settings) -> None:
        self._passwords = Argon2PasswordManager()
        self._tokens = JwtTokenManager(
            settings.auth_jwt_secret,
            settings.auth_jwt_issuer,
            settings.auth_access_ttl_seconds,
            settings.auth_refresh_ttl_seconds,
        )
        self._mailer = SmtpAuthMailer(
            host=settings.smtp_host,
            port=settings.smtp_port,
            sender=settings.smtp_sender,
            web_base_url=settings.web_base_url,
            username=settings.smtp_username,
            password=settings.smtp_password,
            start_tls=settings.smtp_start_tls,
            use_tls=settings.smtp_use_tls,
        )
        self._oauth_client: OAuthClient | None = None
        if settings.google_client_id and settings.google_client_secret:
            redirect_uri = (
                settings.google_redirect_uri or f"{settings.web_base_url}/auth/callback/google"
            )
            self._oauth_client = GoogleOAuthClient(
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
                redirect_uri=redirect_uri,
            )

    def provide_passwords(self) -> PasswordManager:
        return self._passwords

    def provide_tokens(self) -> TokenManager:
        return self._tokens

    def provide_mailer(self) -> AuthMailer:
        return self._mailer

    def provide_oauth_client(self) -> OAuthClient | None:
        return self._oauth_client

