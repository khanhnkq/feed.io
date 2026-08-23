# ADR-0002: PostgreSQL tenant isolation

## Status

Accepted

## Context

Feed.io serves agencies as organizations. The initial load is below 1,000 users, but a missing organization filter must not expose one agency's projects, media or review history to another. Keycloak owns authentication while Feed.io owns organization and project authorization.

The application is a modular monolith with one PostgreSQL database. Database-per-tenant and schema-per-tenant would increase migration, connection-pool and operational complexity without a matching scale requirement.

## Decision

- Use shared tables with an `organization_id` tenant discriminator.
- Require application repositories to scope every tenant query.
- Add PostgreSQL Row-Level Security as defense in depth after the API can set transaction-local tenant context.
- Add `UNIQUE (organization_id, id)` to tenant parents and composite foreign keys on tenant children.
- Mirror Keycloak identities in `users`; never store credentials or OIDC tokens.
- Model external reviewers separately from users through hashed share sessions.
- Use migration owner, API and worker database roles with least-privilege grants.

Migration `0002_identity_tenancy` establishes identity, organization and membership tables plus the organization foreign key for existing projects. RLS policies are intentionally deferred to migration `0008_rls_policies`; enabling them before transaction context exists would lock out the API or encourage a dangerous bypass role.

## Trade-offs

- Repeating `organization_id` adds storage and requires composite constraints, but makes tenant checks and indexes explicit.
- RLS adds session-context and integration-test complexity, but limits the blast radius of a repository bug.
- A shared database cannot isolate noisy tenants as strongly as database-per-tenant, which is acceptable at the target scale.
- Deferring RLS creates a temporary period where application filters are the only isolation layer; cross-tenant tests remain mandatory during that period.

## Consequences

- Every new tenant-owned table must document its tenant key, composite foreign keys and RLS policy.
- Integration fixtures must contain at least two organizations.
- Public share-token resolution needs a narrow security-definer function before normal RLS-scoped queries.
- Revisit database-per-tenant only for contractual isolation requirements, regional residency or independently operated enterprise tenants.
