class InvalidAccessTokenError(ValueError):
    """Raised when an access token cannot be trusted."""


class IdentityProviderError(RuntimeError):
    """Raised when Keycloak cannot complete an OIDC operation."""


class UserDisabledError(PermissionError):
    """Raised when a disabled local user tries to access Feed.io."""
