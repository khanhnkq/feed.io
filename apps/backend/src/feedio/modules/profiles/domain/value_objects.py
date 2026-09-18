from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProfileUpdate:
    """Validated profile fields to update."""

    display_name: str | None = None
    job_title: str | None = None
    timezone: str | None = None
    locale: str | None = None
