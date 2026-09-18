from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.profiles.domain.entities import ProfileRecord


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    display_name: str
    avatar_url: str | None
    job_title: str | None
    timezone: str
    locale: str
    created_at: datetime

    @classmethod
    def from_domain(cls, record: ProfileRecord) -> "ProfileResponse":
        return cls(
            id=record.id,
            user_id=record.user_id,
            display_name=record.display_name,
            avatar_url=record.avatar_url,
            job_title=record.job_title,
            timezone=record.timezone,
            locale=record.locale,
            created_at=record.created_at,
        )


class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    display_name: str | None = Field(default=None, min_length=2, max_length=120)
    job_title: str | None = Field(default=None, max_length=120)
    timezone: str | None = Field(default=None, max_length=64)
    locale: str | None = Field(default=None, max_length=10)


class AvatarUploadResponse(BaseModel):
    avatar_url: str
