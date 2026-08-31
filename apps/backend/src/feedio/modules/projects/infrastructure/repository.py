from uuid import UUID

from sqlalchemy import and_, delete as sa_delete
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.identity.infrastructure.models import UserTable
from feedio.modules.projects.domain.entities import (
    BreadcrumbItem,
    Folder,
    Project,
    ProjectMember,
)
from feedio.modules.projects.domain.errors import (
    InvalidProjectNameError,
    ProjectNotFoundError,
)
from feedio.modules.projects.infrastructure.folder_repository import SqlFolderRepository
from feedio.modules.projects.infrastructure.models import (
    FolderTable,
    ProjectMemberTable,
    ProjectTable,
)
from feedio.shared.domain.pagination import Page
from feedio.shared.infrastructure.pagination import decode_cursor, encode_cursor


class SqlProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._folders = SqlFolderRepository(session)

    async def add(
        self,
        project: Project,
        created_by_user_id: UUID | None = None,
    ) -> Project:
        row = ProjectTable(
            id=project.id,
            organization_id=project.organization_id,
            name=project.name,
            description=project.description,
            visibility=project.visibility,
            created_by_user_id=created_by_user_id,
            created_at=project.created_at,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._project_to_domain(row)

    async def get(self, organization_id: UUID, project_id: UUID) -> Project | None:
        statement = select(ProjectTable).where(
            col(ProjectTable.organization_id) == organization_id,
            col(ProjectTable.id) == project_id,
        )
        row = (await self._session.execute(statement)).scalar_one_or_none()
        return self._project_to_domain(row) if row else None

    async def list_for_organization(
        self,
        organization_id: UUID,
        user_id: UUID | None = None,
        is_admin: bool = True,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[Project]:
        if is_admin or user_id is None:
            statement = (
                select(ProjectTable)
                .where(col(ProjectTable.organization_id) == organization_id)
            )
        else:
            member_project_ids = select(ProjectMemberTable.project_id).where(
                col(ProjectMemberTable.user_id) == user_id
            )
            statement = (
                select(ProjectTable)
                .where(
                    col(ProjectTable.organization_id) == organization_id,
                    or_(
                        col(ProjectTable.visibility) == "public",
                        col(ProjectTable.id).in_(member_project_ids),
                    ),
                )
            )

        if cursor:
            decoded = decode_cursor(cursor)
            if decoded:
                cur_created_at, cur_id = decoded
                statement = statement.where(
                    or_(
                        col(ProjectTable.created_at) < cur_created_at,
                        and_(
                            col(ProjectTable.created_at) == cur_created_at,
                            col(ProjectTable.id) < cur_id,
                        ),
                    )
                )

        statement = statement.order_by(
            col(ProjectTable.created_at).desc(),
            col(ProjectTable.id).desc(),
        ).limit(limit + 1)

        rows = list((await self._session.execute(statement)).scalars().all())
        has_more = len(rows) > limit
        items_rows = rows[:limit]
        items = [self._project_to_domain(row) for row in items_rows]
        next_cursor = (
            encode_cursor(items_rows[-1].created_at, items_rows[-1].id)
            if has_more and items_rows
            else None
        )
        return Page(items=items, next_cursor=next_cursor, has_more=has_more)

    async def update(
        self,
        organization_id: UUID,
        project_id: UUID,
        name: str | None = None,
        description: str | None = None,
        visibility: str | None = None,
    ) -> Project:
        statement = select(ProjectTable).where(
            col(ProjectTable.organization_id) == organization_id,
            col(ProjectTable.id) == project_id,
        )
        row = (await self._session.execute(statement)).scalar_one_or_none()
        if row is None:
            raise ProjectNotFoundError("Project not found")

        if name is not None:
            normalized_name = name.strip()
            if not normalized_name or len(normalized_name) > 120:
                raise InvalidProjectNameError("Project name must contain 1 to 120 characters")
            row.name = normalized_name

        if description is not None:
            row.description = description.strip()

        if visibility is not None:
            row.visibility = "private" if visibility.strip().lower() == "private" else "public"

        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._project_to_domain(row)

    async def delete(self, organization_id: UUID, project_id: UUID) -> None:
        statement = select(ProjectTable).where(
            col(ProjectTable.organization_id) == organization_id,
            col(ProjectTable.id) == project_id,
        )
        row = (await self._session.execute(statement)).scalar_one_or_none()
        if row is None:
            raise ProjectNotFoundError("Project not found")

        await self._session.execute(
            sa_delete(FolderTable).where(
                col(FolderTable.organization_id) == organization_id,
                col(FolderTable.project_id) == project_id,
            )
        )
        await self._session.execute(
            sa_delete(ProjectMemberTable).where(
                col(ProjectMemberTable.project_id) == project_id,
            )
        )
        await self._session.delete(row)
        await self._session.commit()

    async def list_project_members(
        self,
        organization_id: UUID,
        project_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[ProjectMember]:
        statement = (
            select(ProjectMemberTable, UserTable)
            .join(UserTable, col(ProjectMemberTable.user_id) == col(UserTable.id))
            .where(col(ProjectMemberTable.project_id) == project_id)
        )

        if cursor:
            decoded = decode_cursor(cursor)
            if decoded:
                cur_created_at, cur_id = decoded
                statement = statement.where(
                    or_(
                        col(ProjectMemberTable.created_at) < cur_created_at,
                        and_(
                            col(ProjectMemberTable.created_at) == cur_created_at,
                            col(ProjectMemberTable.user_id) < cur_id,
                        ),
                    )
                )

        statement = statement.order_by(
            col(ProjectMemberTable.created_at).desc(),
            col(ProjectMemberTable.user_id).desc(),
        ).limit(limit + 1)

        results = list((await self._session.execute(statement)).all())
        has_more = len(results) > limit
        items_results = results[:limit]
        items = [
            ProjectMember(
                project_id=pm.project_id,
                user_id=pm.user_id,
                project_role=pm.project_role,
                email=user.email,
                display_name=user.display_name,
                created_at=pm.created_at,
            )
            for pm, user in items_results
        ]
        next_cursor = (
            encode_cursor(items_results[-1][0].created_at, items_results[-1][0].user_id)
            if has_more and items_results
            else None
        )
        return Page(items=items, next_cursor=next_cursor, has_more=has_more)

    async def add_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        project_role: str,
    ) -> ProjectMember:
        row = ProjectMemberTable(
            project_id=project_id,
            user_id=user_id,
            project_role=project_role,
        )
        self._session.add(row)
        await self._session.commit()

        user_stmt = select(UserTable).where(col(UserTable.id) == user_id)
        user = (await self._session.execute(user_stmt)).scalar_one()

        return ProjectMember(
            project_id=row.project_id,
            user_id=row.user_id,
            project_role=row.project_role,
            email=user.email,
            display_name=user.display_name,
            created_at=row.created_at,
        )

    async def remove_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
    ) -> None:
        statement = sa_delete(ProjectMemberTable).where(
            col(ProjectMemberTable.project_id) == project_id,
            col(ProjectMemberTable.user_id) == user_id,
        )
        await self._session.execute(statement)
        await self._session.commit()

    async def update_project_member_role(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        new_role: str,
    ) -> None:
        statement = select(ProjectMemberTable).where(
            col(ProjectMemberTable.project_id) == project_id,
            col(ProjectMemberTable.user_id) == user_id,
        )
        row = (await self._session.execute(statement)).scalar_one_or_none()
        if row is not None:
            row.project_role = new_role
            self._session.add(row)
            await self._session.commit()

    async def is_user_project_member(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> bool:
        statement = select(ProjectMemberTable).where(
            col(ProjectMemberTable.project_id) == project_id,
            col(ProjectMemberTable.user_id) == user_id,
        )
        return (await self._session.execute(statement)).scalar_one_or_none() is not None

    async def get_user_project_role(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> str | None:
        statement = select(ProjectMemberTable.project_role).where(
            col(ProjectMemberTable.project_id) == project_id,
            col(ProjectMemberTable.user_id) == user_id,
        )
        return (await self._session.execute(statement)).scalar_one_or_none()

    # Delegate folder operations
    async def add_folder(self, folder: Folder) -> Folder:
        return await self._folders.add_folder(folder)

    async def list_folders(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[Folder]:
        return await self._folders.list_folders(
            organization_id=organization_id,
            project_id=project_id,
            parent_id=parent_id,
            cursor=cursor,
            limit=limit,
        )

    async def get_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> Folder | None:
        return await self._folders.get_folder(organization_id, project_id, folder_id)

    async def rename_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_name: str,
    ) -> Folder:
        return await self._folders.rename_folder(organization_id, project_id, folder_id, new_name)

    async def delete_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> None:
        await self._folders.delete_folder(organization_id, project_id, folder_id)

    async def get_folder_breadcrumbs(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> list[BreadcrumbItem]:
        return await self._folders.get_folder_breadcrumbs(organization_id, project_id, folder_id)

    async def move_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_parent_id: UUID | None,
    ) -> Folder:
        return await self._folders.move_folder(
            organization_id, project_id, folder_id, new_parent_id
        )

    async def get_folder_tree(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[Folder]:
        return await self._folders.get_folder_tree(organization_id, project_id)

    @staticmethod
    def _project_to_domain(row: ProjectTable) -> Project:
        return Project(
            id=row.id,
            organization_id=row.organization_id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
            visibility=row.visibility,
        )
