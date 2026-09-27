from uuid import uuid4

from sqlalchemy import UniqueConstraint

from feedio.modules.identity.domain.entities import AuthIdentityRecord, UserRecord
from feedio.modules.identity.infrastructure.models import (
    AuthIdentityTable,
    UserTable,
)


def constraint_names(table: type[object], constraint_type: type[object]) -> set[str | None]:
    sql_table = table.__table__  # type: ignore[attr-defined]
    return {
        constraint.name
        for constraint in sql_table.constraints
        if isinstance(constraint, constraint_type)
    }


def test_user_password_hash_is_nullable_for_oauth() -> None:
    password_hash_col = UserTable.__table__.columns["password_hash"]
    assert password_hash_col.nullable is True


def test_auth_identities_schema_and_constraints() -> None:
    columns = AuthIdentityTable.__table__.columns
    assert "id" in columns
    assert "user_id" in columns
    assert "provider" in columns
    assert "provider_user_id" in columns
    assert "provider_email" in columns
    assert "created_at" in columns
    assert "updated_at" in columns

    # Check unique constraint on (provider, provider_user_id)
    unique_constraints = constraint_names(AuthIdentityTable, UniqueConstraint)
    assert "uq_auth_identities_provider_uid" in unique_constraints

    # Check foreign key to users.id with CASCADE
    fks = list(AuthIdentityTable.__table__.foreign_keys)
    assert len(fks) == 1
    assert fks[0].target_fullname == "users.id"
    assert fks[0].ondelete == "CASCADE"

    # Check index on user_id
    index_names = {idx.name for idx in AuthIdentityTable.__table__.indexes}
    assert "ix_auth_identities_user_id" in index_names


def test_user_record_allows_none_password_hash() -> None:
    user = UserRecord(
        id=uuid4(),
        email="oauth-user@example.com",
        password_hash=None,
        status="active",
        email_verified_at=None,
    )
    assert user.password_hash is None
    assert user.email == "oauth-user@example.com"


def test_auth_identity_record_structure() -> None:
    user_id = uuid4()
    identity_id = uuid4()
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    identity = AuthIdentityRecord(
        id=identity_id,
        user_id=user_id,
        provider="google",
        provider_user_id="google-sub-123456",
        provider_email="user@gmail.com",
        created_at=now,
        updated_at=now,
    )
    assert identity.provider == "google"
    assert identity.provider_user_id == "google-sub-123456"
    assert identity.user_id == user_id
