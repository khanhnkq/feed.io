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
from feedio.modules.identity.domain.entities import GoogleUserInfo, SessionView
from feedio.modules.identity.domain.errors import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    GoogleEmailNotVerifiedError,
    InvalidAccessTokenError,
    InvalidCredentialsError,
    InvalidCurrentPasswordError,
    OAuthOnlyAccountError,
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
        display_name: str | None = None,
    ) -> None:
        normalized_email = email.strip().lower()
        if await self._repository.find_user_by_email(normalized_email):
            raise EmailAlreadyRegisteredError("Email is already registered")
        user = await self._repository.create_pending_user(
            email=normalized_email,
            password_hash=self._passwords.hash(password),
        )
        raw_token = await self._new_action_token(user.id, "verify_email", hours=24)
        await self._mailer.send_verification(user.email, raw_token, display_name)

    async def verify_email(self, token: str) -> None:
        await self._repository.verify_email(_hash_token(token))

    async def resend_verification(self, email: str) -> None:
        user = await self._repository.find_user_by_email(email.strip().lower())
        if user is None or user.email_verified_at is not None or user.status == "disabled":
            return
        raw_token = await self._new_action_token(user.id, "verify_email", hours=24)
        await self._mailer.send_verification(user.email, raw_token)

    async def login(
        self,
        *,
        email: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        user = await self._repository.find_user_by_email(email.strip().lower())
        if user is None:
            raise InvalidCredentialsError("Email or password is invalid")
        if user.password_hash is None:
            raise OAuthOnlyAccountError(
                "This account was registered using Google. Please log in with Google "
                "or reset your password to create a password."
            )
        if not self._passwords.verify(password, user.password_hash):
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
        await self._mailer.send_password_reset(user.email, raw_token)

    async def reset_password(self, token: str, new_password: str) -> None:
        await self._repository.reset_password(
            _hash_token(token),
            self._passwords.hash(new_password),
        )

    async def list_sessions(self, user_id: UUID) -> list[SessionView]:
        return await self._repository.list_sessions(user_id, UUID(int=0))

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        await self._repository.revoke_session(user_id, session_id)

    async def change_password(
        self,
        user_id: UUID,
        current_password: str,
        new_password: str,
        current_session_id: UUID | None = None,
        revoke_other_sessions: bool = True,
    ) -> None:
        current_hash = await self._repository.get_password_hash(user_id)
        if not current_hash or not self._passwords.verify(current_password, current_hash):
            raise InvalidCurrentPasswordError("Current password does not match")

        new_hash = self._passwords.hash(new_password)
        await self._repository.update_password_hash(user_id, new_hash)

        if revoke_other_sessions and current_session_id:
            await self._repository.revoke_other_sessions(user_id, current_session_id)

    async def set_initial_password(
        self,
        user_id: UUID,
        new_password: str,
    ) -> None:
        current_hash = await self._repository.get_password_hash(user_id)
        if current_hash is not None:
            raise ValueError("User already has a password set. Use change-password instead.")
        new_hash = self._passwords.hash(new_password)
        await self._repository.update_password_hash(user_id, new_hash)

    async def login_with_google(
        self,
        user_info: GoogleUserInfo,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        if not user_info.email_verified:
            raise GoogleEmailNotVerifiedError("Google email is not verified")

        normalized_email = user_info.email.strip().lower()
        identity = await self._repository.find_identity("google", user_info.sub)

        if identity is not None:
            user = await self._repository.find_user_by_id(identity.user_id)
            if user is None:
                raise InvalidAccessTokenError("User identity mapping is invalid")
            if user.status == "disabled":
                raise UserDisabledError("User is disabled")
        else:
            existing_user = await self._repository.find_user_by_email(normalized_email)
            if existing_user is None:
                # Brand new user registering via Google OAuth
                user = await self._repository.create_user_with_identity(
                    email=normalized_email,
                    provider="google",
                    provider_user_id=user_info.sub,
                    provider_email=normalized_email,
                    display_name=user_info.name,
                )
            else:
                if existing_user.status == "disabled":
                    raise UserDisabledError("User is disabled")

                if existing_user.email_verified_at is None:
                    # Pre-Account Takeover Defense (C2):
                    # Attacker registered victim's email before victim verified.
                    # Victim now logs in via Google (trusted email ownership).
                    # We clear old password, verify the email, and link identity.
                    await self._repository.clear_password_and_verify(existing_user.id)
                    await self._repository.link_identity(
                        user_id=existing_user.id,
                        provider="google",
                        provider_user_id=user_info.sub,
                        provider_email=normalized_email,
                    )
                    user = await self._repository.find_user_by_id(existing_user.id)
                    if user is None:
                        raise InvalidAccessTokenError("User identity mapping is invalid")
                else:
                    # Safe Account Linking (C1):
                    # Existing user verified email previously, now linking Google.
                    await self._repository.link_identity(
                        user_id=existing_user.id,
                        provider="google",
                        provider_user_id=user_info.sub,
                        provider_email=normalized_email,
                    )
                    user = existing_user

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
