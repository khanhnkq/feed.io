# Contributing to Feed.io

Thank you for helping build a self-hosted video review platform. Contributions of code, tests, documentation, design feedback and operational knowledge are welcome.

## Before you start

- Search existing issues and pull requests.
- Open an issue before a large feature or architectural change.
- Keep one pull request focused on one outcome.
- Never add a managed SaaS dependency to a core runtime path.
- Read the architecture ADR and engineering standards.

## Development setup

```bash
git clone https://github.com/khanhnkq/feed.io.git
cd feed.io
cp .env.example .env
make bootstrap
make infra-up
```

Run `make api` and `make web` in separate terminals. See the README for service URLs and Garage bootstrap.

## Branch and commit conventions

Use a branch name tied to the issue:

```text
<github-user>/<linear-id>-short-description
```

Prefer Conventional Commits:

```text
feat(projects): add cursor pagination
fix(api): keep tenant scope in project lookup
docs(contributing): explain generated client flow
```

## Architecture rules

- Backend dependencies flow `presentation → application → domain`.
- Infrastructure implements application ports; bootstrap wires adapters.
- Modules expose only `public.py` to other modules.
- Frontend routes only compose feature modules.
- React components do not call Axios directly.
- Server state belongs in TanStack Query; local interaction state belongs in Zustand.
- Hand-written files cannot exceed 500 physical lines.

Avoid generic `utils`, `helpers`, `manager` or `service` modules. Name code after the responsibility or use case.

## API contract changes

After changing a FastAPI request or response:

```bash
make generate
git diff -- packages/api-client/src/generated
```

Generated files are committed. Do not edit them manually and do not place business logic in them.

## Tests and verification

Add the narrowest useful test:

- Domain/application rule → unit test.
- HTTP contract → FastAPI contract test.
- Adapter/driver → integration test with the real container.
- React behavior → Vitest + Testing Library.
- Critical user flow → Playwright.

Before pushing:

```bash
make verify
docker compose -f infra/compose/compose.dev.yaml config --quiet
```

## Pull request checklist

- The issue and user-visible outcome are linked.
- Tests prove the new behavior and important errors.
- No dependency boundary or 500-line rule is violated.
- OpenAPI output is regenerated when required.
- Documentation/ADR/runbook changed with behavior or operations.
- No secret, token, presigned URL or personal data is committed.
- The change is backward-compatible, or migration/rollback is documented.

Maintainers may ask for a smaller pull request when independent responsibilities are mixed.

## Reporting bugs

Use the bug template with reproduction steps, expected behavior, logs with secrets removed, and environment versions. Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not a public issue.

## License

By contributing, you agree that your contribution is licensed under Apache-2.0.
