# ADR-0004: Self-hosted SaaS authentication

- Status: Accepted
- Date: 2026-08-23
- Supersedes: ADR-0003

## Context

Feed.io needs familiar SaaS account creation, mandatory email verification, password recovery and user-visible session revocation without relying on a managed identity platform or Keycloak. The initial audience is below 1,000 users, but authentication remains security-critical and must preserve clean module boundaries.

## Decision

- FastAPI owns registration, login, logout, refresh, email verification, password recovery and session management.
- Passwords are hashed with Argon2id through `pwdlib`; plaintext passwords are never stored or logged.
- Access JWTs expire after five minutes. Refresh JWTs expire after 30 days and identify a server-side `auth_sessions` row.
- Both JWTs are stored in `HttpOnly`, `SameSite=Lax` cookies. State-changing cookie requests require a double-submit CSRF token.
- PostgreSQL stores only SHA-256 hashes of refresh, verification and password-reset tokens. Raw action tokens exist only in the email URL.
- Every refresh rotates the refresh token. Presenting an old token revokes that session as reuse detection.
- Email verification is mandatory. Consuming a verification token activates only the account.
- After the first login, an account without an active organization membership is routed to onboarding. Creating the workspace and owner membership is one database transaction.
- Password reset consumes a one-time token and revokes every active session for that user.
- Mail is sent over SMTP to self-hosted Mailpit locally and Stalwart in production.
- Valkey is retained for rate limiting and ephemeral coordination; PostgreSQL remains authoritative for identities and sessions.

## Consequences

Feed.io provides a first-party SaaS UX and can run without an external identity service. Account identity is no longer coupled to tenant creation, so future invitation acceptance can attach a verified account to an existing workspace without creating an unwanted tenant. The project now owns password policy, email deliverability, abuse controls, credential migrations and future MFA implementation. Security-sensitive code requires focused tests and review. Production deployments must use TLS, a random JWT secret, SMTP authentication and rate limiting at both Nginx and application layers.

## Rejected alternatives

- Keycloak: capable but adds a second user-facing identity UI and operational database, conflicting with the requested first-party SaaS flow.
- Managed authentication: violates the self-host-only constraint.
- Tokens in browser storage: exposes bearer credentials to JavaScript and increases XSS impact.
