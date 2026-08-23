from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_prefix="FEEDIO_",
        extra="ignore",
    )

    app_name: str = "Feed.io API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://feedio:feedio@localhost:5432/feedio"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
