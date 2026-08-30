from typing import Protocol
from uuid import UUID

from feedio.modules.projects.domain.entities import (
    BreadcrumbItem,
    Folder,
    Project,
    ProjectMember,
)


class ProjectRepository(Protocol):
    async def add(
        self,
        project: Project,
        created_by_user_id: UUID | None = None,
    ) -> Project: ...

    async def get(self, organization_id: UUID, project_id: UUID) -> Project | None: ...

    async def list_for_organization(
        self,
        organization_id: UUID,
        user_id: UUID | None = None,
        is_admin: bool = True,
    ) -> list[Project]: ...

    async def update(
        self,
        organization_id: UUID,
        project_id: UUID,
        name: str | None = None,
        description: str | None = None,
        visibility: str | None = None,
    ) -> Project: ...

    async def delete(self, organization_id: UUID, project_id: UUID) -> None: ...

    async def list_project_members(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[ProjectMember]: ...

    async def add_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        project_role: str,
    ) -> ProjectMember: ...

    async def remove_project_member(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
    ) -> None: ...

    async def update_project_member_role(
        self,
        organization_id: UUID,
        project_id: UUID,
        user_id: UUID,
        new_role: str,
    ) -> None: ...

    async def is_user_project_member(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> bool: ...

    async def get_user_project_role(
        self,
        project_id: UUID,
        user_id: UUID,
    ) -> str | None: ...

    async def add_folder(self, folder: Folder) -> Folder: ...

    async def list_folders(
        self,
        organization_id: UUID,
        project_id: UUID,
        parent_id: UUID | None = None,
    ) -> list[Folder]: ...

    async def get_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> Folder | None: ...

    async def rename_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_name: str,
    ) -> Folder: ...

    async def delete_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> None: ...

    async def get_folder_breadcrumbs(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
    ) -> list[BreadcrumbItem]: ...

    async def move_folder(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID,
        new_parent_id: UUID | None,
    ) -> Folder: ...

    async def get_folder_tree(
        self,
        organization_id: UUID,
        project_id: UUID,
    ) -> list[Folder]: ...
