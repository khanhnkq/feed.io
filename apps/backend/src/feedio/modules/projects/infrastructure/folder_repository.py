from uuid import UUID

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from feedio.modules.projects.domain.entities import BreadcrumbItem, Folder
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderCycleError,
    FolderNotFoundError,
    InvalidFolderNameError,
)
from feedio.modules.projects.infrastructure.models import FolderTable
from feedio.shared.infrastructure.persistence import utc_now


class SqlFolderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add_folder(self, folder: Folder) -> Folder:
        if folder.parent_id is not None:
            parent = await self._get_folder_row(
                folder.organization_id, folder.project_id, folder.parent_id
            )
            if parent is None:
                raise FolderNotFoundError("Parent folder not found")

        stmt = select(FolderTable).where(
            col(FolderTable.organization_id) == folder.organization_id,
            col(FolderTable.project_id) == folder.project_id,
            col(FolderTable.parent_id) == folder.parent_id,
            func.lower(col(FolderTable.name)) == func.lower(folder.name),
            col(FolderTable.deleted_at).is_(None),
        )
        existing = (await self._session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise DuplicateFolderNameError(
                f"A folder named '{folder.name}' already exists in this location"
            )

        row = FolderTable(
            id=folder.id,
            organization_id=folder.organization_id,
            project_id=folder.project_id,
            parent_id=folder.parent_id,
            name=folder.name,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
            deleted_at=folder.deleted_at,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._folder_to_domain(row)

    async def list_folders(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID | None = None,
    ) -> list[Folder]:
        statement = (
            select(FolderTable)
            .where(
                col(FolderTable.organization_id) == organization_id,
                col(FolderTable.project_id) == project_id,
                col(FolderTable.parent_id) == parent_id,
                col(FolderTable.deleted_at).is_(None),
            )
            .order_by(col(FolderTable.name).asc())
        )
        rows = (await self._session.execute(statement)).scalars().all()
        return [self._folder_to_domain(row) for row in rows]

    async def get_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> Folder | None:
        row = await self._get_folder_row(organization_id, project_id, folder_id)
        return self._folder_to_domain(row) if row else None

    async def rename_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_name: str,
    ) -> Folder:
        normalized_name = new_name.strip()
        if not normalized_name or len(normalized_name) > 120:
            raise InvalidFolderNameError("Folder name must contain 1 to 120 characters")

        row = await self._get_folder_row(organization_id, project_id, folder_id)
        if row is None:
            raise FolderNotFoundError("Folder not found")

        stmt = select(FolderTable).where(
            col(FolderTable.organization_id) == organization_id,
            col(FolderTable.project_id) == project_id,
            col(FolderTable.parent_id) == row.parent_id,
            func.lower(col(FolderTable.name)) == func.lower(normalized_name),
            col(FolderTable.id) != folder_id,
            col(FolderTable.deleted_at).is_(None),
        )
        existing = (await self._session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise DuplicateFolderNameError(
                f"A folder named '{normalized_name}' already exists in this location"
            )

        row.name = normalized_name
        row.updated_at = utc_now()
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._folder_to_domain(row)

    async def delete_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> None:
        row = await self._get_folder_row(organization_id, project_id, folder_id)
        if row is None:
            raise FolderNotFoundError("Folder not found")

        ids_to_delete = [folder_id] + await self._collect_descendant_folder_ids(
            organization_id, project_id, folder_id
        )
        stmt = (
            update(FolderTable)
            .where(
                col(FolderTable.organization_id) == organization_id,
                col(FolderTable.project_id) == project_id,
                col(FolderTable.id).in_(ids_to_delete),
            )
            .values(deleted_at=utc_now())
        )
        await self._session.execute(stmt)
        await self._session.commit()

    async def get_folder_breadcrumbs(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> list[BreadcrumbItem]:
        breadcrumbs: list[BreadcrumbItem] = []
        current_id: UUID | None = folder_id

        while current_id is not None:
            row = await self._get_folder_row(organization_id, project_id, current_id)
            if row is None:
                if not breadcrumbs:
                    raise FolderNotFoundError("Folder not found")
                break
            breadcrumbs.append(BreadcrumbItem(id=row.id, name=row.name))
            current_id = row.parent_id

        breadcrumbs.reverse()
        return breadcrumbs

    async def move_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_parent_id: UUID | None,
    ) -> Folder:
        row = await self._get_folder_row(organization_id, project_id, folder_id)
        if row is None:
            raise FolderNotFoundError("Folder not found")

        if new_parent_id is not None:
            if new_parent_id == folder_id:
                raise FolderCycleError("Cannot move folder into itself")

            target_parent = await self._get_folder_row(organization_id, project_id, new_parent_id)
            if target_parent is None:
                raise FolderNotFoundError("Target parent folder not found")

            curr: UUID | None = new_parent_id
            while curr is not None:
                if curr == folder_id:
                    raise FolderCycleError("Cannot move folder into its own subfolder")
                p = await self._get_folder_row(organization_id, project_id, curr)
                curr = p.parent_id if p else None

        stmt = select(FolderTable).where(
            col(FolderTable.organization_id) == organization_id,
            col(FolderTable.project_id) == project_id,
            col(FolderTable.parent_id) == new_parent_id,
            func.lower(col(FolderTable.name)) == func.lower(row.name),
            col(FolderTable.id) != folder_id,
            col(FolderTable.deleted_at).is_(None),
        )
        existing = (await self._session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise DuplicateFolderNameError(
                f"A folder named '{row.name}' already exists in the target location"
            )

        row.parent_id = new_parent_id
        row.updated_at = utc_now()
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._folder_to_domain(row)

    async def get_folder_tree(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[Folder]:
        statement = (
            select(FolderTable)
            .where(
                col(FolderTable.organization_id) == organization_id,
                col(FolderTable.project_id) == project_id,
                col(FolderTable.deleted_at).is_(None),
            )
            .order_by(col(FolderTable.name).asc())
        )
        rows = (await self._session.execute(statement)).scalars().all()
        return [self._folder_to_domain(row) for row in rows]

    async def _get_folder_row(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> FolderTable | None:
        statement = select(FolderTable).where(
            col(FolderTable.organization_id) == organization_id,
            col(FolderTable.project_id) == project_id,
            col(FolderTable.id) == folder_id,
            col(FolderTable.deleted_at).is_(None),
        )
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def _collect_descendant_folder_ids(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID,
    ) -> list[UUID]:
        ids: list[UUID] = []
        queue = [parent_id]
        while queue:
            current_parent = queue.pop(0)
            stmt = select(FolderTable.id).where(
                col(FolderTable.organization_id) == organization_id,
                col(FolderTable.project_id) == project_id,
                col(FolderTable.parent_id) == current_parent,
                col(FolderTable.deleted_at).is_(None),
            )
            child_ids = (await self._session.execute(stmt)).scalars().all()
            for child_id in child_ids:
                ids.append(child_id)
                queue.append(child_id)
        return ids

    @staticmethod
    def _folder_to_domain(row: FolderTable) -> Folder:
        return Folder(
            id=row.id,
            organization_id=row.organization_id,
            project_id=row.project_id,
            parent_id=row.parent_id,
            name=row.name,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at,
        )
