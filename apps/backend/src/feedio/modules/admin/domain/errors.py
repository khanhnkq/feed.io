class AdminError(Exception):
    """Base exception for platform administration errors."""


class InsufficientAdminPrivilegesError(AdminError):
    """User does not have administrative privileges to perform this action."""


class AdminUserNotFoundError(AdminError):
    """The requested user was not found."""


class AdminOrganizationNotFoundError(AdminError):
    """The requested organization was not found."""


class InvalidRoleError(AdminError):
    """The requested platform role is invalid."""


class InvalidStatusError(AdminError):
    """The requested status is invalid."""
