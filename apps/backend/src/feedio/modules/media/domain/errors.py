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


class ShareLinkNotFoundError(Exception):
    """Raised when a share link is not found."""


class ShareLinkExpiredError(Exception):
    """Raised when a share link has expired."""


class ShareLinkRevokedError(Exception):
    """Raised when a share link has been revoked."""


class InvalidPassphraseError(Exception):
    """Raised when an incorrect passphrase is provided for a protected share link."""


class ShareLinkPermissionDeniedError(Exception):
    """Raised when an action is not permitted on this share link."""

