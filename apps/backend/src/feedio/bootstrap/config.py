import json
from functools import lru_cache
from typing import Any, Self

from pydantic import AliasChoices, Field, field_validator, model_validator
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
    garage_admin_url: str = Field(
        default="http://localhost:3903",
        validation_alias=AliasChoices("FEEDIO_GARAGE_ADMIN_URL", "GARAGE_ADMIN_URL"),
    )
    garage_admin_token: str = Field(
        default="replace-me",
        validation_alias=AliasChoices("FEEDIO_GARAGE_ADMIN_TOKEN", "GARAGE_ADMIN_TOKEN"),
    )
    garage_s3_endpoint_url: str = Field(
        default="http://localhost:3900",
        validation_alias=AliasChoices("FEEDIO_GARAGE_S3_ENDPOINT_URL", "GARAGE_S3_ENDPOINT_URL"),
    )
    garage_s3_bucket: str = Field(
        default="feedio-media",
        validation_alias=AliasChoices("FEEDIO_GARAGE_S3_BUCKET", "GARAGE_S3_BUCKET"),
    )
    garage_s3_access_key: str = Field(
        default="replace-me",
        validation_alias=AliasChoices("FEEDIO_GARAGE_S3_ACCESS_KEY", "GARAGE_S3_ACCESS_KEY"),
    )
    garage_s3_secret_key: str = Field(
        default="replace-me",
        validation_alias=AliasChoices("FEEDIO_GARAGE_S3_SECRET_KEY", "GARAGE_S3_SECRET_KEY"),
    )
    garage_s3_region: str = Field(
        default="garage",
        validation_alias=AliasChoices("FEEDIO_GARAGE_S3_REGION", "GARAGE_S3_REGION"),
    )
    auth_jwt_secret: str = "local-only-change-this-32-byte-secret"
    auth_jwt_issuer: str = "feedio"
    auth_access_ttl_seconds: int = 300
    auth_refresh_ttl_seconds: int = 2_592_000
    auth_cookie_secure: bool = False
    web_base_url: str = "http://localhost:3000"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_sender: str = "Feed.io <no-reply@feedio.local>"
    smtp_start_tls: bool = False
    dependency_timeout_seconds: float = 2.0
    worker_metrics_port: int = 9101
    worker_probe_interval_seconds: float = 10.0
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8088"]
    )
    garage_s3_cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8088"],
        validation_alias=AliasChoices(
            "FEEDIO_GARAGE_S3_CORS_ORIGINS",
            "GARAGE_S3_CORS_ORIGINS",
            "FEEDIO_CORS_ORIGINS",
        ),
    )

    @field_validator("cors_origins", "garage_s3_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    pass
            return [x.strip() for x in value.split(",") if x.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if item]
        return ["http://localhost:3000", "http://localhost:8088"]

    @model_validator(mode="after")
    def validate_production_auth(self) -> Self:
        if self.environment != "development":
            if len(self.auth_jwt_secret) < 48 or "local-only" in self.auth_jwt_secret:
                raise ValueError(
                    "Production FEEDIO_AUTH_JWT_SECRET must be at least 48 random bytes"
                )
            if not self.auth_cookie_secure:
                raise ValueError("Production authentication requires secure cookies")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
