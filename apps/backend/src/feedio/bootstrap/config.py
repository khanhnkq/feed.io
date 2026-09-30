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

    app_name: str = "Feedi API"
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
    google_client_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FEEDIO_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"),
    )
    google_client_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FEEDIO_GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"),
    )
    google_redirect_uri: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FEEDIO_GOOGLE_REDIRECT_URI", "GOOGLE_REDIRECT_URI"),
    )
    default_org_storage_quota_bytes: int = 50 * 1024 * 1024 * 1024  # 50 GB
    max_single_file_size_bytes: int = 50 * 1024 * 1024 * 1024  # 50 GB
    web_base_url: str = "http://localhost:3000"
    billing_provider: str = Field(
        default="mock",
        validation_alias=AliasChoices("FEEDIO_BILLING_PROVIDER", "BILLING_PROVIDER"),
    )
    payments_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("FEEDIO_PAYMENTS_ENABLED", "PAYMENTS_ENABLED"),
    )
    stripe_secret_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FEEDIO_STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY"),
    )
    stripe_webhook_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FEEDIO_STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET"),
    )
    stripe_price_pro_100gb_monthly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_100GB_MONTHLY", "STRIPE_PRICE_PRO_100GB_MONTHLY"
        ),
    )
    stripe_price_pro_100gb_yearly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_100GB_YEARLY", "STRIPE_PRICE_PRO_100GB_YEARLY"
        ),
    )
    stripe_price_pro_500gb_monthly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_500GB_MONTHLY", "STRIPE_PRICE_PRO_500GB_MONTHLY"
        ),
    )
    stripe_price_pro_500gb_yearly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_500GB_YEARLY", "STRIPE_PRICE_PRO_500GB_YEARLY"
        ),
    )
    stripe_price_pro_1tb_monthly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_1TB_MONTHLY", "STRIPE_PRICE_PRO_1TB_MONTHLY"
        ),
    )
    stripe_price_pro_1tb_yearly: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_STRIPE_PRICE_PRO_1TB_YEARLY", "STRIPE_PRICE_PRO_1TB_YEARLY"
        ),
    )
    smtp_host: str = Field(
        default="localhost",
        validation_alias=AliasChoices("FEEDIO_SMTP_HOST", "SMTP_HOST"),
    )
    smtp_port: int = Field(
        default=1025,
        validation_alias=AliasChoices("FEEDIO_SMTP_PORT", "SMTP_PORT"),
    )
    smtp_sender: str = Field(
        default="Feedi <no-reply@feedi.local>",
        validation_alias=AliasChoices(
            "FEEDIO_SMTP_SENDER", "SMTP_SENDER", "FEEDIO_MAIL_FROM", "MAIL_FROM"
        ),
    )
    smtp_username: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_SMTP_USER", "FEEDIO_SMTP_USERNAME", "SMTP_USER", "SMTP_USERNAME"
        ),
    )
    smtp_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "FEEDIO_SMTP_PASS", "FEEDIO_SMTP_PASSWORD", "SMTP_PASS", "SMTP_PASSWORD"
        ),
    )
    smtp_start_tls: bool = Field(
        default=False,
        validation_alias=AliasChoices("FEEDIO_SMTP_START_TLS", "SMTP_START_TLS"),
    )
    smtp_use_tls: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "FEEDIO_SMTP_USE_TLS", "SMTP_USE_TLS", "FEEDIO_SMTP_SSL", "SMTP_SSL"
        ),
    )
    dependency_timeout_seconds: float = 2.0
    worker_metrics_port: int = 9101
    worker_probe_interval_seconds: float = 10.0
    subscription_reconcile_interval_seconds: int = 43200  # 12 hours
    collaboration_presence_ttl_seconds: int = 120
    collaboration_ping_interval_seconds: int = 25
    rate_limit_enabled: bool = True
    rate_limit_auth_rpm: int = 10
    rate_limit_upload_rpm: int = 30
    rate_limit_general_rpm: int = 200
    rate_limit_dev_multiplier: int = 100
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

    def get_effective_rate_limit(self, base_rpm: int) -> int:
        if not self.rate_limit_enabled:
            return 1_000_000
        if self.environment == "development":
            return base_rpm * max(1, self.rate_limit_dev_multiplier)
        return base_rpm


@lru_cache
def get_settings() -> Settings:
    return Settings()
