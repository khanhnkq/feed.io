# ADR-0001: Modular monolith first

- Status: accepted
- Date: 2026-08-23

## Context

Feed.io targets agencies and fewer than 1,000 initial users. Video processing and realtime collaboration need independent processes, but the business model does not justify distributed business services yet.

## Decision

Use one Python package with API, Celery worker and scheduler entrypoints. Business modules expose only `public.py`; internal code follows `presentation → application → domain`, while infrastructure implements application ports. Next.js uses thin routes and feature modules. OpenAPI is the contract, and Orval generates the Axios client.

PostgreSQL is authoritative. Valkey is an ephemeral Redis-compatible cache and pub/sub service; RabbitMQ is the durable task broker. Garage stores media through its S3-compatible API.

## Consequences

- Transactions and authorization remain simple and testable.
- API and workers can scale separately from the same codebase.
- A module can be extracted later only when profiling proves the need.
- CI must enforce boundaries and the 500-line source-file rule.
