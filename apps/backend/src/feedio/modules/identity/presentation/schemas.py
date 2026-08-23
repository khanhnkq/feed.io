from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.identity.domain.models import CurrentUser, SessionView


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=1, max_length=128)


class EmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ActionTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)


class ResetPasswordRequest(ActionTokenRequest):
    new_password: str = Field(min_length=12, max_length=128)


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    email_verified: bool
    has_organization: bool

    @classmethod
    def from_domain(cls, user: CurrentUser) -> "CurrentUserResponse":
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            email_verified=user.email_verified,
            has_organization=user.has_organization,
        )


class SessionResponse(BaseModel):
    id: UUID
    user_agent: str | None
    ip_address: str | None
    current: bool

    @classmethod
    def from_domain(cls, session: SessionView) -> "SessionResponse":
        return cls(
            id=session.id,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            current=session.current,
        )
