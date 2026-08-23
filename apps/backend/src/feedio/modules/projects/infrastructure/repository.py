from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.projects.domain.entities import Project
from feedio.modules.projects.infrastructure.models import ProjectTable


class SqlProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, project: Project) -> Project:
        row = ProjectTable(
            id=project.id,
            organization_id=project.organization_id,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_domain(row)

    async def list_for_organization(self, organization_id: UUID) -> list[Project]:
        statement = (
            select(ProjectTable)
            .where(ProjectTable.organization_id == organization_id)
            .order_by(col(ProjectTable.created_at).desc(), col(ProjectTable.id).desc())
        )
        rows = (await self._session.execute(statement)).scalars().all()
        return [self._to_domain(row) for row in rows]

    @staticmethod
    def _to_domain(row: ProjectTable) -> Project:
        return Project(
            id=row.id,
            organization_id=row.organization_id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
        )
