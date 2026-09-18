from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class ProfileRecord:
    """Full user profile representation."""

    id: UUID
    user_id: UUID
    display_name: str
    avatar_url: str | None
    job_title: str | None
    timezone: str
    locale: str
    created_at: datetime
    updated_at: datetime
