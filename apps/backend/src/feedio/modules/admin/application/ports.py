from abc import ABC, abstractmethod
from uuid import UUID

from feedio.modules.admin.domain.entities import (
    AdminAuditLog,
    AdminOrganization,
    AdminUser,
    PlatformMetrics,
)


class AdminRepository(ABC):
    @abstractmethod
    async def get_metrics(self) -> PlatformMetrics:
        """Compute real platform performance and resource utilization metrics."""

    @abstractmethod
    async def list_users(self) -> list[AdminUser]:
        """Fetch all platform users with profile details and membership counts."""

    @abstractmethod
    async def update_user_role(
        self,
        *,
        user_id: UUID,
        new_role: str,
        actor_email: str,
        actor_role: str,
        ip_address: str = "127.0.0.1",
    ) -> AdminUser:
        """Change a user's platform role and record an audit log event."""

    @abstractmethod
    async def update_user_status(
        self,
        *,
        user_id: UUID,
        new_status: str,
        actor_email: str,
        actor_role: str,
        ip_address: str = "127.0.0.1",
    ) -> AdminUser:
        """Change a user's status (active/suspended) and record an audit log event."""

    @abstractmethod
    async def list_organizations(self) -> list[AdminOrganization]:
        """Fetch all organizations with actual storage usage and owner emails."""

    @abstractmethod
    async def update_organization_quota(
        self,
        *,
        organization_id: UUID,
        new_quota_bytes: int,
        actor_email: str,
        actor_role: str,
        ip_address: str = "127.0.0.1",
    ) -> AdminOrganization:
        """Update organization storage limit and record an audit log event."""

    @abstractmethod
    async def list_audit_logs(self, limit: int = 100) -> list[AdminAuditLog]:
        """Fetch chronological security audit logs."""

    @abstractmethod
    async def record_audit_log(
        self,
        *,
        actor_email: str,
        actor_role: str,
        action: str,
        target_type: str,
        target_name: str,
        details: str,
        ip_address: str = "127.0.0.1",
        status: str = "success",
    ) -> AdminAuditLog:
        """Persist a new audit log event."""
