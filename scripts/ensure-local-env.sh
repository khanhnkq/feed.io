#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${project_root}/.env"

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate local development secrets" >&2
  exit 1
fi

clean_deprecated_auth_vars() {
  local source_file="$1"
  local cleaned_file
  cleaned_file="$(mktemp "${source_file}.clean.XXXXXX")"
  grep -Ev '^(KEYCLOAK_|FEEDIO_KEYCLOAK_|FEEDIO_AUTH_SUCCESS_URL=)' "${source_file}" >"${cleaned_file}" || true
  chmod 600 "${cleaned_file}"
  mv "${cleaned_file}" "${source_file}"
}

if [[ -f "${env_file}" ]]; then
  clean_deprecated_auth_vars "${env_file}"
  if ! grep -q '^AUTH_JWT_SECRET=' "${env_file}"; then
    auth_jwt_secret="$(openssl rand -hex 48)"
    printf '\nAUTH_JWT_SECRET=%s\n' "${auth_jwt_secret}" >>"${env_file}"
    echo "Added self-hosted auth JWT secret to ${env_file}"
  else
    auth_jwt_secret="$(grep '^AUTH_JWT_SECRET=' "${env_file}" | cut -d= -f2-)"
    echo "Using existing ${env_file}"
  fi
  if ! grep -q '^FEEDIO_AUTH_JWT_SECRET=' "${env_file}"; then
    printf 'FEEDIO_AUTH_JWT_SECRET=%s\n' "${auth_jwt_secret}" >>"${env_file}"
  fi
  chmod 600 "${env_file}"
  exit 0
fi

umask 077
postgres_password="$(openssl rand -hex 24)"
rabbitmq_password="$(openssl rand -hex 24)"
garage_rpc_secret="$(openssl rand -hex 32)"
garage_admin_token="$(openssl rand -hex 32)"
garage_metrics_token="$(openssl rand -hex 32)"
garage_access_key="GK$(openssl rand -hex 12)"
garage_secret_key="$(openssl rand -hex 32)"
auth_jwt_secret="$(openssl rand -hex 48)"
grafana_password="$(openssl rand -hex 24)"
glitchtip_secret="$(openssl rand -hex 32)"

cat >"${env_file}" <<EOF
FEEDIO_ENVIRONMENT=development
FEEDIO_DATABASE_URL=postgresql+psycopg://feedio:${postgres_password}@localhost:5432/feedio
FEEDIO_VALKEY_URL=redis://localhost:6379/0
FEEDIO_RABBITMQ_URL=amqp://feedio:${rabbitmq_password}@localhost:5672/
FEEDIO_GARAGE_ADMIN_URL=http://localhost:3903
FEEDIO_GARAGE_ADMIN_TOKEN=${garage_admin_token}
FEEDIO_AUTH_JWT_SECRET=${auth_jwt_secret}
FEEDIO_AUTH_JWT_ISSUER=feedio
FEEDIO_AUTH_ACCESS_TTL_SECONDS=300
FEEDIO_AUTH_REFRESH_TTL_SECONDS=2592000
FEEDIO_AUTH_COOKIE_SECURE=false
FEEDIO_WEB_BASE_URL=http://localhost:8088
FEEDIO_SMTP_HOST=localhost
FEEDIO_SMTP_PORT=1025
FEEDIO_SMTP_SENDER="Feed.io <no-reply@feedio.local>"
FEEDIO_SMTP_START_TLS=false
FEEDIO_CORS_ORIGINS='["http://localhost:3000","http://localhost:8088"]'
NEXT_PUBLIC_API_URL=http://localhost:8088
POSTGRES_USER=feedio
POSTGRES_PASSWORD=${postgres_password}
POSTGRES_DB=feedio
RABBITMQ_DEFAULT_USER=feedio
RABBITMQ_DEFAULT_PASS=${rabbitmq_password}
GARAGE_RPC_SECRET=${garage_rpc_secret}
GARAGE_ADMIN_TOKEN=${garage_admin_token}
GARAGE_METRICS_TOKEN=${garage_metrics_token}
GARAGE_S3_BUCKET=feedio-media
GARAGE_S3_ACCESS_KEY=${garage_access_key}
GARAGE_S3_SECRET_KEY=${garage_secret_key}
GARAGE_LOCAL_CAPACITY=10G
AUTH_JWT_SECRET=${auth_jwt_secret}
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${grafana_password}
GLITCHTIP_SECRET_KEY=${glitchtip_secret}
EOF

echo "Generated ${env_file} with mode 600. Keep this file private."
