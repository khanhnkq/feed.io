"""Optimize database integrity, foreign keys, and indexes.

Revision ID: 20260914_0017
Revises: 20260908_0016
Create Date: 2026-09-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

revision: str = "20260914_0017"
down_revision: str | None = "20260908_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enhance projects table with soft-delete & updated_at
    op.add_column(
        "projects",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.add_column(
        "projects",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_projects_org_active",
        "projects",
        ["organization_id", "created_at", "id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # 2. Add missing Foreign Keys to media_comments
    op.create_foreign_key(
        "fk_media_comments_organization_id",
        "media_comments",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_media_comments_project_id",
        "media_comments",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_media_comments_media_id",
        "media_comments",
        "media_assets",
        ["media_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_media_comments_user_id",
        "media_comments",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_media_comments_parent_comment_id",
        "media_comments",
        "media_comments",
        ["parent_comment_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop redundant single-column indexes on media_comments (already prefixed in ix_media_comments_lookup)
    op.drop_index("ix_media_comments_organization_id", table_name="media_comments")
    op.drop_index("ix_media_comments_project_id", table_name="media_comments")

    # 3. Add missing Foreign Keys to notifications
    op.create_foreign_key(
        "fk_notifications_user_id",
        "notifications",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_notifications_organization_id",
        "notifications",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_notifications_actor_id",
        "notifications",
        "users",
        ["actor_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 4. Support Guest reviewers in media_review_decisions
    op.alter_column(
        "media_review_decisions",
        "user_id",
        existing_type=PG_UUID(as_uuid=True),
        nullable=True,
    )
    op.add_column(
        "media_review_decisions",
        sa.Column("guest_name", sa.String(length=120), nullable=True),
    )
    op.create_check_constraint(
        "ck_media_review_decisions_reviewer",
        "media_review_decisions",
        "(user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)",
    )

    # 5. Add XOR target scope check constraint on share_links
    op.create_check_constraint(
        "ck_share_links_target_scope",
        "share_links",
        "(media_id IS NOT NULL AND folder_id IS NULL) OR (media_id IS NULL AND folder_id IS NOT NULL)",
    )

    # 6. Create Transactional Outbox table
    op.create_table(
        "outbox_events",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            PG_UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("aggregate_type", sa.String(length=50), nullable=False),
        sa.Column("aggregate_id", PG_UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_outbox_events_pending",
        "outbox_events",
        ["available_at", "id"],
        postgresql_where=sa.text("processed_at IS NULL"),
    )
    op.create_index(
        "ix_outbox_events_org_agg",
        "outbox_events",
        ["organization_id", "aggregate_type", "aggregate_id"],
    )


def downgrade() -> None:
    # 6. Drop outbox_events
    op.drop_index("ix_outbox_events_org_agg", table_name="outbox_events")
    op.drop_index("ix_outbox_events_pending", table_name="outbox_events")
    op.drop_table("outbox_events")

    # 5. Drop share_links check
    op.drop_constraint("ck_share_links_target_scope", "share_links", type_="check")

    # 4. Revert media_review_decisions
    op.drop_constraint("ck_media_review_decisions_reviewer", "media_review_decisions", type_="check")
    op.drop_column("media_review_decisions", "guest_name")
    op.alter_column(
        "media_review_decisions",
        "user_id",
        existing_type=PG_UUID(as_uuid=True),
        nullable=False,
    )

    # 3. Revert notifications
    op.drop_constraint("fk_notifications_actor_id", "notifications", type_="foreignkey")
    op.drop_constraint("fk_notifications_organization_id", "notifications", type_="foreignkey")
    op.drop_constraint("fk_notifications_user_id", "notifications", type_="foreignkey")

    # 2. Revert media_comments
    op.create_index("ix_media_comments_project_id", "media_comments", ["project_id"])
    op.create_index("ix_media_comments_organization_id", "media_comments", ["organization_id"])
    op.drop_constraint("fk_media_comments_parent_comment_id", "media_comments", type_="foreignkey")
    op.drop_constraint("fk_media_comments_user_id", "media_comments", type_="foreignkey")
    op.drop_constraint("fk_media_comments_media_id", "media_comments", type_="foreignkey")
    op.drop_constraint("fk_media_comments_project_id", "media_comments", type_="foreignkey")
    op.drop_constraint("fk_media_comments_organization_id", "media_comments", type_="foreignkey")

    # 1. Revert projects
    op.drop_index("ix_projects_org_active", table_name="projects")
    op.drop_column("projects", "deleted_at")
    op.drop_column("projects", "updated_at")
