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
    database_url: str = "postgresql+psycopg://feedio:replace-me@localhost:5432/feedio"
    valkey_url: str = "redis://localhost:6379/0"
    rabbitmq_url: str = "amqp://feedio:replace-me@localhost:5672/"
    garage_admin_url: str = "http://localhost:3903"
    garage_admin_token: str = "replace-me"
    dependency_timeout_seconds: float = 2.0
    worker_metrics_port: int = 9101
    worker_probe_interval_seconds: float = 10.0
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
