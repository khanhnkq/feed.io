import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from feedio.modules.identity.application.ports import (
    AuthMailer,
    AuthRepository,
    PasswordManager,
    TokenManager,
)
from feedio.modules.identity.domain.entities import SessionView
from feedio.modules.identity.domain.errors import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidAccessTokenError,
    InvalidCredentialsError,
    RefreshTokenReuseError,
    UserDisabledError,
)
from feedio.modules.identity.domain.value_objects import AuthTokens


class AuthService:
    def __init__(
        self,
        *,
        repository: AuthRepository,
        passwords: PasswordManager,
        tokens: TokenManager,
        mailer: AuthMailer,
        refresh_ttl_seconds: int,
    ) -> None:
        self._repository = repository
        self._passwords = passwords
        self._tokens = tokens
        self._mailer = mailer
        self._refresh_ttl = refresh_ttl_seconds

    async def register(
        self,
        *,
        email: str,
        password: str,
        display_name: str,
    ) -> None:
        normalized_email = email.strip().lower()
        if await self._repository.find_user_by_email(normalized_email):
            raise EmailAlreadyRegisteredError("Email is already registered")
        user = await self._repository.create_pending_user(
            email=normalized_email,
            password_hash=self._passwords.hash(password),
            display_name=display_name.strip(),
        )
        raw_token = await self._new_action_token(user.id, "verify_email", hours=24)
        await self._mailer.send_verification(user.email, user.display_name, raw_token)

    async def verify_email(self, token: str) -> None:
        await self._repository.verify_email(_hash_token(token))

    async def resend_verification(self, email: str) -> None:
        user = await self._repository.find_user_by_email(email.strip().lower())
        if user is None or user.email_verified_at is not None or user.status == "disabled":
            return
        raw_token = await self._new_action_token(user.id, "verify_email", hours=24)
        await self._mailer.send_verification(user.email, user.display_name, raw_token)

    async def login(
        self,
        *,
        email: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        user = await self._repository.find_user_by_email(email.strip().lower())
        if user is None or not self._passwords.verify(password, user.password_hash):
            raise InvalidCredentialsError("Email or password is invalid")
        if user.status == "disabled":
            raise UserDisabledError("User is disabled")
        if user.email_verified_at is None:
            raise EmailNotVerifiedError("Email is not verified")
        session_id = uuid4()
        tokens = self._tokens.issue(user.id, session_id)
        await self._repository.create_session(
            session_id=session_id,
            user_id=user.id,
            refresh_token_hash=_hash_token(tokens.refresh_token),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=_expires_in(self._refresh_ttl),
        )
        return tokens

    async def refresh(self, refresh_token: str) -> AuthTokens:
        claims = self._tokens.verify_refresh(refresh_token)
        user = await self._repository.find_user_by_id(claims.user_id)
        if user is None or user.status != "active":
            raise InvalidAccessTokenError("Refresh token user is unavailable")
        replacement = self._tokens.issue(claims.user_id, claims.session_id)
        rotated = await self._repository.rotate_session(
            session_id=claims.session_id,
            presented_hash=_hash_token(refresh_token),
            replacement_hash=_hash_token(replacement.refresh_token),
            expires_at=_expires_in(self._refresh_ttl),
        )
        if not rotated:
            raise RefreshTokenReuseError("Refresh token is expired, revoked, or reused")
        return replacement

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            claims = self._tokens.verify_refresh(refresh_token)
        except InvalidAccessTokenError:
            return
        await self._repository.revoke_session_by_token(claims.session_id)

    async def forgot_password(self, email: str) -> None:
        user = await self._repository.find_user_by_email(email.strip().lower())
        if user is None or user.status != "active" or user.email_verified_at is None:
            return
        raw_token = await self._new_action_token(user.id, "reset_password", minutes=60)
        await self._mailer.send_password_reset(user.email, user.display_name, raw_token)

    async def reset_password(self, token: str, new_password: str) -> None:
        await self._repository.reset_password(
            _hash_token(token),
            self._passwords.hash(new_password),
        )

    async def list_sessions(self, user_id: UUID) -> list[SessionView]:
        return await self._repository.list_sessions(user_id, UUID(int=0))

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        await self._repository.revoke_session(user_id, session_id)

    async def _new_action_token(
        self,
        user_id: UUID,
        purpose: str,
        *,
        hours: int = 0,
        minutes: int = 0,
    ) -> str:
        token = secrets.token_urlsafe(32)
        await self._repository.replace_action_token(
            user_id=user_id,
            purpose=purpose,
            token_hash=_hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(hours=hours, minutes=minutes),
        )
        return token


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _expires_in(seconds: int) -> datetime:
    return datetime.now(UTC) + timedelta(seconds=seconds)
