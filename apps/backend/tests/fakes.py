from datetime import UTC, datetime
from uuid import UUID

from feedio.modules.projects.domain.entities import (
    BreadcrumbItem,
    Folder,
    Project,
    ProjectMember,
)
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderCycleError,
    FolderNotFoundError,
    InvalidFolderNameError,
    ProjectNotFoundError,
)


class InMemoryProjectRepository:
    def __init__(self) -> None:
        self.projects: list[Project] = []
        self.folders: list[Folder] = []
        self.members: list[ProjectMember] = []

    async def add(
        self,
        project: Project,
        created_by_user_id: UUID | None = None,
    ) -> Project:
        self.projects.append(project)
        return project

    async def get(self, organization_id: UUID, project_id: UUID) -> Project | None:
        for project in self.projects:
            if project.organization_id == organization_id and project.id == project_id:
                return project
        return None

    async def list_for_organization(
        self,
        organization_id: UUID,
        user_id: UUID | None = None,
        is_admin: bool = True,
    ) -> list[Project]:
        if is_admin or user_id is None:
            return [item for item in self.projects if item.organization_id == organization_id]
        member_pids = {m.project_id for m in self.members if m.user_id == user_id}
        return [
            item
            for item in self.projects
            if item.organization_id == organization_id
            and (item.visibility == "public" or item.id in member_pids)
        ]

    async def update(
        self,
        organization_id: UUID,
        project_id: UUID,
        name: str | None = None,
        description: str | None = None,
        visibility: str | None = None,
    ) -> Project:
        project = await self.get(organization_id, project_id)
        if project is None:
            raise ProjectNotFoundError("Project not found")
        updated = project.update(name=name, description=description, visibility=visibility)
        idx = self.projects.index(project)
        self.projects[idx] = updated
        return updated

    async def delete(self, organization_id: UUID, project_id: UUID) -> None:
        project = await self.get(organization_id, project_id)
        if project is None:
            raise ProjectNotFoundError("Project not found")
        self.projects.remove(project)
        self.folders = [f for f in self.folders if f.project_id != project_id]
        self.members = [m for m in self.members if m.project_id != project_id]

    async def list_project_members(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[ProjectMember]:
        return [m for m in self.members if m.project_id == project_id]

    async def add_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        project_role: str,
    ) -> ProjectMember:
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            project_role=project_role,
            email=f"user-{str(user_id)[:6]}@agency.test",
            display_name="Project Member",
            created_at=datetime.now(UTC),
        )
        self.members.append(member)
        return member

    async def remove_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
    ) -> None:
        self.members = [
            m for m in self.members if not (m.project_id == project_id and m.user_id == user_id)
        ]

    async def update_project_member_role(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        new_role: str,
    ) -> None:
        for idx, m in enumerate(self.members):
            if m.project_id == project_id and m.user_id == user_id:
                self.members[idx] = ProjectMember(
                    project_id=m.project_id,
                    user_id=m.user_id,
                    project_role=new_role,
                    email=m.email,
                    display_name=m.display_name,
                    created_at=m.created_at,
                )

    async def is_user_project_member(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> bool:
        return any(m.project_id == project_id and m.user_id == user_id for m in self.members)

    async def get_user_project_role(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> str | None:
        for m in self.members:
            if m.project_id == project_id and m.user_id == user_id:
                return m.project_role
        return None

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

    async def move_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_parent_id: UUID | None,
    ) -> Folder:
        folder = await self.get_folder(organization_id, project_id, folder_id)
        if folder is None:
            raise FolderNotFoundError("Folder not found")

        if new_parent_id is not None:
            if new_parent_id == folder_id:
                raise FolderCycleError("Cannot move folder into itself")

            target_parent = await self.get_folder(organization_id, project_id, new_parent_id)
            if target_parent is None:
                raise FolderNotFoundError("Target parent folder not found")

            # Check for cycle by traversing up from new_parent_id
            curr: UUID | None = new_parent_id
            while curr is not None:
                if curr == folder_id:
                    raise FolderCycleError("Cannot move folder into its own subfolder")
                p = await self.get_folder(organization_id, project_id, curr)
                curr = p.parent_id if p else None

        # Check duplicate name at target parent
        for f in self.folders:
            if (
                f.organization_id == organization_id
                and f.project_id == project_id
                and f.parent_id == new_parent_id
                and f.deleted_at is None
                and f.id != folder_id
                and f.name.lower() == folder.name.lower()
            ):
                raise DuplicateFolderNameError(
                    f"A folder named '{folder.name}' already exists in the target location"
                )

        now = datetime.now(UTC)
        for i, f in enumerate(self.folders):
            if f.id == folder_id:
                updated = Folder(
                    id=f.id,
                    organization_id=f.organization_id,
                    project_id=f.project_id,
                    parent_id=new_parent_id,
                    name=f.name,
                    created_at=f.created_at,
                    updated_at=now,
                    deleted_at=f.deleted_at,
                )
                self.folders[i] = updated
                return updated

        raise FolderNotFoundError("Folder not found")

    async def get_folder_tree(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[Folder]:
        return [
            f
            for f in self.folders
            if f.organization_id == organization_id
            and f.project_id == project_id
            and f.deleted_at is None
        ]
