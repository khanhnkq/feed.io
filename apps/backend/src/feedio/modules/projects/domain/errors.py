class InvalidProjectNameError(ValueError):
    """Raised when a project name is empty or too long."""


class InvalidFolderNameError(ValueError):
    """Raised when a folder name is empty or too long."""


class FolderNotFoundError(ValueError):
    """Raised when a requested folder does not exist or has been deleted."""


class DuplicateFolderNameError(ValueError):
    """Raised when a folder with the same name already exists in the parent directory."""


class FolderCycleError(ValueError):
    """Raised when moving a folder would create a parent-child cycle."""
