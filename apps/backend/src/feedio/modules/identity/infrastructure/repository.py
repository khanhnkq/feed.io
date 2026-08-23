from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from feedio.modules.identity.domain.errors import UserDisabledError
from feedio.modules.identity.domain.models import CurrentUser, IdentityClaims
from feedio.modules.identity.infrastructure.models import UserTable


class SqlIdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def provision(self, claims: IdentityClaims) -> CurrentUser:
        statement = (
            insert(UserTable)
            .values(
                keycloak_subject=claims.subject,
                email=claims.email,
                display_name=claims.display_name,
                status="active",
            )
            .on_conflict_do_update(
                constraint="uq_users_keycloak_subject",
                set_={
                    "email": claims.email,
                    "display_name": claims.display_name,
                    "updated_at": func.now(),
                },
            )
            .returning(UserTable)
        )
        row = (await self._session.execute(statement)).scalar_one()
        await self._session.commit()
        if row.status != "active":
            raise UserDisabledError("User is disabled")
        return CurrentUser(
            id=row.id,
            subject=row.keycloak_subject,
            email=row.email,
            display_name=row.display_name,
        )
