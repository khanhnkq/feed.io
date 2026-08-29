class OrganizationAccessDeniedError(PermissionError):
    """Raised when a user is not an active organization member."""


class MemberNotFoundError(LookupError):
    """Raised when a specified member is not found in the organization."""


class CannotRemoveSoleOwnerError(ValueError):
    """Raised when attempting to remove the only owner of an organization."""


class CannotChangeSoleOwnerRoleError(ValueError):
    """Raised when attempting to change the role of the only owner."""


class InvitationNotFoundError(LookupError):
    """Raised when an invitation is not found by ID or token hash."""


class InvitationExpiredError(ValueError):
    """Raised when attempting to accept or use an expired invitation."""


class InvitationAlreadyAcceptedError(ValueError):
    """Raised when attempting to accept an invitation that was already accepted."""


class InvitationRevokedError(ValueError):
    """Raised when attempting to accept a revoked invitation."""


class UserAlreadyMemberError(ValueError):
    """Raised when inviting an email that is already an active member."""


class UserNotRegisteredError(LookupError):
    """Raised when inviting an email that has not registered or verified an account on Feed.io."""


class InsufficientRolePermissionError(PermissionError):
    """Raised when an actor's role does not permit the requested member management action."""


class InvitationEmailMismatchError(PermissionError):
    """Raised when the logged in user accepts an invitation sent to another email."""

