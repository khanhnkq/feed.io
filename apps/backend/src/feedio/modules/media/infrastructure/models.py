from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class MediaAssetTable(SQLModel, table=True):
    __tablename__ = "media_assets"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "id",
            name="uq_media_assets_organization_id_id",
        ),
        Index(
            "ix_media_assets_project_folder_active",
            "organization_id",
            "project_id",
            "folder_id",
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "ix_media_assets_project_created_active",
            "project_id",
            "created_at",
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="RESTRICT",
    )
    project_id: UUID = Field(
        foreign_key="projects.id",
        ondelete="CASCADE",
    )
    folder_id: UUID | None = Field(
        default=None,
        foreign_key="folders.id",
        ondelete="SET NULL",
    )
    created_by_user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        ondelete="SET NULL",
    )
    title: str = Field(max_length=255)
    filename: str = Field(max_length=255)
    file_size_bytes: int = Field(
        default=0,
        sa_column=Column(BigInteger(), nullable=False, server_default="0"),
    )
    mime_type: str = Field(
        default="video/mp4",
        sa_column=Column(String(100), nullable=False, server_default="video/mp4"),
    )
    storage_key: str = Field(
        sa_column=Column(String(500), nullable=False, unique=True),
    )
    status: str = Field(
        default="uploading",
        sa_column=Column(String(30), nullable=False, server_default="uploading"),
    )
    duration_seconds: float | None = Field(
        default=None,
        sa_column=Column(Float(), nullable=True),
    )
    width: int | None = Field(
        default=None,
        sa_column=Column(Integer(), nullable=True),
    )
    height: int | None = Field(
        default=None,
        sa_column=Column(Integer(), nullable=True),
    )
    fps: float | None = Field(
        default=None,
        sa_column=Column(Float(), nullable=True),
    )
    thumbnail_storage_key: str | None = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    hls_storage_key: str | None = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    proxy_storage_key: str | None = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    filmstrip_storage_key: str | None = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    filmstrip_vtt_storage_key: str | None = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )
    waveform_data: str | None = Field(
        default=None,
        sa_column=Column(Text(), nullable=True),
    )
    error_message: str | None = Field(
        default=None,
        sa_column=Column(Text(), nullable=True),
    )
    version_group_id: UUID | None = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True),
    )
    version_number: int = Field(
        default=1,
        sa_column=Column(Integer(), nullable=False, server_default="1"),
    )
    review_status: str = Field(
        default="pending",
        sa_column=Column(String(30), nullable=False, server_default="pending"),
    )
    reviewed_by_user_id: UUID | None = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True),
    )
    reviewed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class MediaReviewDecisionTable(SQLModel, table=True):
    __tablename__ = "media_review_decisions"
    __table_args__ = (
        Index(
            "ix_media_review_decisions_media_created",
            "media_id",
            "created_at",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="CASCADE",
        index=True,
    )
    project_id: UUID = Field(
        foreign_key="projects.id",
        ondelete="CASCADE",
        index=True,
    )
    media_id: UUID = Field(
        foreign_key="media_assets.id",
        ondelete="CASCADE",
        index=True,
    )
    user_id: UUID = Field(
        foreign_key="users.id",
        ondelete="CASCADE",
        index=True,
    )
    status: str = Field(
        sa_column=Column(String(30), nullable=False),
    )
    notes: str | None = Field(
        default=None,
        sa_column=Column(Text(), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )


class ShareLinkTable(SQLModel, table=True):
    __tablename__ = "share_links"
    __table_args__ = (
        Index("ix_share_links_token_hash", "token_hash", unique=True),
        Index("ix_share_links_media_id", "media_id"),
        Index("ix_share_links_org_proj", "organization_id", "project_id"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="CASCADE",
        index=True,
    )
    project_id: UUID = Field(
        foreign_key="projects.id",
        ondelete="CASCADE",
        index=True,
    )
    media_id: UUID | None = Field(
        default=None,
        foreign_key="media_assets.id",
        ondelete="CASCADE",
        index=True,
    )
    folder_id: UUID | None = Field(
        default=None,
        foreign_key="folders.id",
        ondelete="CASCADE",
    )
    created_by_user_id: UUID = Field(
        foreign_key="users.id",
        ondelete="CASCADE",
    )
    token_hash: str = Field(
        sa_column=Column(String(64), nullable=False, unique=True),
    )
    passphrase_hash: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    allow_comments: bool = Field(
        default=True,
        sa_column=Column(Boolean(), nullable=False, server_default="true"),
    )
    allow_approval: bool = Field(
        default=True,
        sa_column=Column(Boolean(), nullable=False, server_default="true"),
    )
    allow_download: bool = Field(
        default=False,
        sa_column=Column(Boolean(), nullable=False, server_default="false"),
    )
    expires_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    access_count: int = Field(
        default=0,
        sa_column=Column(Integer(), nullable=False, server_default="0"),
    )
    is_revoked: bool = Field(
        default=False,
        sa_column=Column(Boolean(), nullable=False, server_default="false"),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )


