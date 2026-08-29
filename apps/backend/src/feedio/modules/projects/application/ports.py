from typing import Protocol
from uuid import UUID

from feedio.modules.projects.domain.entities import BreadcrumbItem, Folder, Project


class ProjectRepository(Protocol):
    async def add(self, project: Project) -> Project: ...

    async def get(self, organization_id: UUID, project_id: UUID) -> Project | None: ...

    async def list_for_organization(self, organization_id: UUID) -> list[Project]: ...

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
