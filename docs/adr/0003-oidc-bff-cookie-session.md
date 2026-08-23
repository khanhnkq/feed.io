# ADR-0003: OIDC BFF cookie session

## Status

Accepted

## Context

Feed.io is a browser application backed by a separate FastAPI API. Persisting bearer tokens in `localStorage` would expose them to any successful XSS attack. Letting both Next.js and FastAPI own separate sessions would duplicate refresh, logout and revocation behavior.

Keycloak already provides password policy, MFA, recovery, sessions, token rotation and RFC 7009 revocation. Feed.io needs a narrow browser-facing adapter and must not implement those identity capabilities again.

## Decision

- FastAPI acts as the confidential OIDC backend-for-frontend for browser authentication.
- Login uses Authorization Code Flow with PKCE S256 and an exact callback URI.
- Keycloak issues RS256 access and refresh tokens. FastAPI verifies signature, issuer, audience, expiry and required claims against cached JWKS.
- Access and refresh tokens are stored only in `HttpOnly`, `SameSite=Lax` cookies. Production also requires `Secure` over TLS.
- The refresh cookie is restricted to `/api/v1/auth`; the access cookie is restricted to `/api`.
- A separate readable CSRF cookie must match `X-CSRF-Token` on cookie-authenticated writes, refresh and logout.
- Keycloak rotates refresh tokens with reuse disabled. FastAPI replaces both cookies after every successful refresh.
- Logout calls Keycloak's RFC 7009 revocation endpoint and clears local cookies even if the provider is unavailable.
- Axios sends credentials, copies the CSRF cookie into the header and coalesces concurrent 401 responses into one refresh request.
- Bearer authentication remains available for trusted non-browser clients and integration tests; it does not use cookie CSRF validation.
- Feed.io PostgreSQL stores only the user projection and organization/project authorization. It never stores OIDC tokens or credentials.

## Consequences

- Browser JavaScript cannot read access or refresh tokens, reducing token theft through XSS.
- Cookie authentication requires explicit CSRF controls and exact CORS origins with credentials.
- FastAPI temporarily owns redirects and cookie lifecycle in addition to resource APIs.
- Revoked access tokens can remain valid until their five-minute expiry; sensitive deployments may add introspection at a measured latency cost.
- Keycloak and FastAPI must agree on public issuer, internal endpoint, audience, client secret and redirect URI.
- Production cannot enable cookies without TLS and `FEEDIO_AUTH_COOKIE_SECURE=true`.
