from sqlalchemy import CheckConstraint, UniqueConstraint

from feedio.modules.identity.infrastructure.models import (
    AuthActionTokenTable,
    AuthSessionTable,
    UserTable,
)
from feedio.modules.organizations.infrastructure.models import (
    OrganizationInvitationTable,
    OrganizationMemberTable,
    OrganizationTable,
)
from feedio.modules.projects.infrastructure.models import ProjectTable


def constraint_names(table: type[object], constraint_type: type[object]) -> set[str | None]:
    sql_table = table.__table__  # type: ignore[attr-defined]
    return {
        constraint.name
        for constraint in sql_table.constraints
        if isinstance(constraint, constraint_type)
    }


def test_identity_keys_are_unique() -> None:
    assert constraint_names(UserTable, UniqueConstraint) >= {"uq_users_email"}
    assert "password_hash" in UserTable.__table__.columns
    assert "email_verified_at" in UserTable.__table__.columns
    assert "platform_role" in UserTable.__table__.columns


def test_session_and_action_tokens_store_hashes_not_raw_secrets() -> None:
    assert "refresh_token_hash" in AuthSessionTable.__table__.columns
    assert "token_hash" in AuthActionTokenTable.__table__.columns
    assert "token" not in AuthSessionTable.__table__.columns
    assert "token" not in AuthActionTokenTable.__table__.columns


def test_membership_uses_tenant_and_user_as_primary_key() -> None:
    primary_key_columns = {
        column.name for column in OrganizationMemberTable.__table__.primary_key.columns
    }

    assert primary_key_columns == {"organization_id", "user_id"}
    assert "organization_role" in OrganizationMemberTable.__table__.columns
    assert "role" not in OrganizationMemberTable.__table__.columns
    assert "ck_organization_members_organization_role" in constraint_names(
        OrganizationMemberTable,
        CheckConstraint,
    )


def test_soft_deleted_organizations_can_reuse_slug() -> None:
    slug_index = next(
        index
        for index in OrganizationTable.__table__.indexes
        if index.name == "uq_organizations_slug_active"
    )

    assert slug_index.unique is True
    assert str(slug_index.dialect_options["postgresql"]["where"]) == "deleted_at IS NULL"


def test_only_one_active_invitation_exists_per_email() -> None:
    invitation_index = next(
        index
        for index in OrganizationInvitationTable.__table__.indexes
        if index.name == "uq_organization_invitations_active_email"
    )

    assert invitation_index.unique is True
    assert "accepted_at IS NULL" in str(invitation_index.dialect_options["postgresql"]["where"])


def test_projects_reference_an_organization_with_tenant_safe_key() -> None:
    organization_foreign_keys = {
        foreign_key.target_fullname for foreign_key in ProjectTable.__table__.foreign_keys
    }

    assert "organizations.id" in organization_foreign_keys
    assert "uq_projects_organization_id_id" in constraint_names(ProjectTable, UniqueConstraint)
