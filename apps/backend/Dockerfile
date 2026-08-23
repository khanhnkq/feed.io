FROM ghcr.io/astral-sh/uv:0.11.16-python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
COPY migrations ./migrations
COPY alembic.ini ./
RUN uv sync --frozen --no-dev

FROM python:3.13-slim-bookworm AS runtime

ENV PATH="/app/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN addgroup --system --gid 1001 feedio && adduser --system --uid 1001 --ingroup feedio feedio
COPY --from=builder --chown=feedio:feedio /app /app

USER feedio
EXPOSE 8000
CMD ["fastapi", "run", "src/feedio/entrypoints/api.py", "--host", "0.0.0.0", "--port", "8000"]
