class CommentError(Exception):
    """Base exception for comments domain."""


class CommentNotFoundError(CommentError):
    """Raised when a comment is not found."""


class InvalidCommentContentError(CommentError):
    """Raised when comment content is empty or exceeds max length."""


class CommentAccessDeniedError(CommentError):
    """Raised when a user is not permitted to modify or delete a comment."""
