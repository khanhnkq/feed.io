class InvalidAccessTokenError(ValueError):
    """Raised when a JWT cannot be trusted for its intended use."""


class InvalidCredentialsError(ValueError):
    """Raised when login credentials are invalid."""


class EmailAlreadyRegisteredError(ValueError):
    """Raised when an active registration already owns an email address."""


class EmailNotVerifiedError(PermissionError):
    """Raised when a user must verify their email before signing in."""


class InvalidActionTokenError(ValueError):
    """Raised when a verification or password-reset token is invalid."""


class RefreshTokenReuseError(PermissionError):
    """Raised when a rotated refresh token is presented again."""


class UserDisabledError(PermissionError):
    """Raised when a disabled local user tries to access Feedi."""


class InvalidCurrentPasswordError(ValueError):
    """Raised when the supplied current password does not match during change-password."""


class OAuthOnlyAccountError(ValueError):
    """Raised when trying to use password login on an account registered via OAuth."""


class GoogleEmailNotVerifiedError(PermissionError):
    """Raised when the email provided by Google is not marked as verified."""


class OAuthStateMismatchError(ValueError):
    """Raised when the OAuth state parameter is invalid or does not match the session cookie."""


class OAuthAuthenticationError(ValueError):
    """Raised when exchanging the OAuth code with the provider fails."""
