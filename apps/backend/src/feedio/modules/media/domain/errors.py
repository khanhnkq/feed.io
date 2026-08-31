class MediaNotFoundError(Exception):
    """Raised when a media asset cannot be found."""


class MediaUploadIncompleteError(Exception):
    """Raised when media upload to storage has not been verified."""


class InvalidMediaTypeError(Exception):
    """Raised when the uploaded file type is not supported."""


class MediaAccessDeniedError(Exception):
    """Raised when the user does not have permission to access or modify the media asset."""


class StorageQuotaExceededError(Exception):
    """Raised when an organization's total storage quota is exceeded."""


class FileTooLargeError(Exception):
    """Raised when a single uploaded file exceeds maximum allowed file size."""
