class ProfileNotFoundError(LookupError):
    """Raised when a profile cannot be found for the given user."""


class AvatarTooLargeError(ValueError):
    """Raised when an uploaded avatar exceeds the maximum allowed size (5MB)."""


class AvatarInvalidTypeError(ValueError):
    """Raised when an uploaded avatar has an unsupported MIME type."""
