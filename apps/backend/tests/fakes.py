from datetime import UTC, datetime
from uuid import UUID

from feedio.modules.projects.domain.entities import BreadcrumbItem, Folder, Project
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderNotFoundError,
    InvalidFolderNameError,
)


class InMemoryProjectRepository:
    def __init__(self) -> None:
        self.projects: list[Project] = []
        self.folders: list[Folder] = []

    async def add(self, project: Project) -> Project:
        self.projects.append(project)
        return project

    async def get(self, organization_id: UUID, project_id: UUID) -> Project | None:
        for project in self.projects:
            if project.organization_id == organization_id and project.id == project_id:
                return project
        return None

    async def list_for_organization(self, organization_id: UUID) -> list[Project]:
        return [item for item in self.projects if item.organization_id == organization_id]

    async def add_folder(self, folder: Folder) -> Folder:
        if folder.parent_id is not None:
            parent = await self.get_folder(
                folder.organization_id, folder.project_id, folder.parent_id
            )
            if parent is None:
                raise FolderNotFoundError("Parent folder not found")

        for existing in self.folders:
            if (
                existing.organization_id == folder.organization_id
                and existing.project_id == folder.project_id
                and existing.parent_id == folder.parent_id
                and existing.name.lower() == folder.name.lower()
                and existing.deleted_at is None
            ):
                raise DuplicateFolderNameError(
                    f"A folder named '{folder.name}' already exists in this location"
                )

        self.folders.append(folder)
        return folder

    async def list_folders(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID | None = None,
    ) -> list[Folder]:
        return [
            folder
            for folder in self.folders
            if folder.organization_id == organization_id
            and folder.project_id == project_id
            and folder.parent_id == parent_id
            and folder.deleted_at is None
        ]

    async def get_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> Folder | None:
        for folder in self.folders:
            if (
                folder.organization_id == organization_id
                and folder.project_id == project_id
                and folder.id == folder_id
                and folder.deleted_at is None
            ):
                return folder
        return None

    async def rename_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_name: str,
    ) -> Folder:
        normalized = new_name.strip()
        if not normalized or len(normalized) > 120:
            raise InvalidFolderNameError("Folder name must contain 1 to 120 characters")

        folder = await self.get_folder(organization_id, project_id, folder_id)
        if folder is None:
            raise FolderNotFoundError("Folder not found")

        for existing in self.folders:
            if (
                existing.organization_id == organization_id
                and existing.project_id == project_id
                and existing.parent_id == folder.parent_id
                and existing.name.lower() == normalized.lower()
                and existing.id != folder_id
                and existing.deleted_at is None
            ):
                raise DuplicateFolderNameError(
                    f"A folder named '{normalized}' already exists in this location"
                )

        idx = self.folders.index(folder)
        updated = Folder(
            id=folder.id,
            organization_id=folder.organization_id,
            project_id=folder.project_id,
            parent_id=folder.parent_id,
            name=normalized,
            created_at=folder.created_at,
            updated_at=datetime.now(UTC),
            deleted_at=None,
        )
        self.folders[idx] = updated
        return updated

    async def delete_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> None:
        folder = await self.get_folder(organization_id, project_id, folder_id)
        if folder is None:
            raise FolderNotFoundError("Folder not found")

        # Soft delete folder and all descendants
        to_delete = {folder_id}
        changed = True
        while changed:
            changed = False
            for f in self.folders:
                if f.parent_id in to_delete and f.id not in to_delete:
                    to_delete.add(f.id)
                    changed = True

        now = datetime.now(UTC)
        for i, f in enumerate(self.folders):
            if f.id in to_delete:
                self.folders[i] = Folder(
                    id=f.id,
                    organization_id=f.organization_id,
                    project_id=f.project_id,
                    parent_id=f.parent_id,
                    name=f.name,
                    created_at=f.created_at,
                    updated_at=f.updated_at,
                    deleted_at=now,
                )

    async def get_folder_breadcrumbs(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> list[BreadcrumbItem]:
        breadcrumbs: list[BreadcrumbItem] = []
        current_id: UUID | None = folder_id

        while current_id is not None:
            f = await self.get_folder(organization_id, project_id, current_id)
            if f is None:
                break
            breadcrumbs.append(BreadcrumbItem(id=f.id, name=f.name))
            current_id = f.parent_id

        breadcrumbs.reverse()
        return breadcrumbs
