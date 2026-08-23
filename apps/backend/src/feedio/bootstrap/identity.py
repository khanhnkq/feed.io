from feedio.bootstrap.config import Settings
from feedio.modules.identity.application.ports import AuthMailer, PasswordManager, TokenManager
from feedio.modules.identity.infrastructure.mailer import SmtpAuthMailer
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
            start_tls=settings.smtp_start_tls,
        )

    def provide_passwords(self) -> PasswordManager:
        return self._passwords

    def provide_tokens(self) -> TokenManager:
        return self._tokens

    def provide_mailer(self) -> AuthMailer:
        return self._mailer
