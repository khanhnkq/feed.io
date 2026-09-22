#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Feed.io - Production Environment Setup & Secrets Validation Script
# ==============================================================================

ENV_FILE="${1:-.env.production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> [Feed.io] Verifying production environment file: $ENV_FILE"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    python3 -c "import secrets; print(secrets.token_hex(32))"
  fi
}

generate_s3_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
  else
    python3 -c "import secrets; print(secrets.token_hex(16))"
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> $ENV_FILE does not exist. Generating a new file with secure random keys..."

  JWT_SECRET=$(generate_secret)
  PG_PASSWORD=$(generate_secret)
  RMQ_PASSWORD=$(generate_secret)
  GARAGE_RPC=$(generate_secret)
  GARAGE_ADMIN=$(generate_secret)
  GARAGE_METRICS=$(generate_secret)
  GARAGE_ACCESS=$(generate_s3_key)
  GARAGE_SECRET=$(generate_secret)

  cat > "$ENV_FILE" <<EOF
# ==============================================================================
# FEED.IO PRODUCTION ENVIRONMENT CONFIGURATION
# Architecture: Cloudflare Tunnel Ingress (Zero Open Ports) + Production Build
# ==============================================================================

# 1. Cloudflare Tunnel Ingress
# Obtain token from Cloudflare Zero Trust Dashboard: Networks -> Tunnels -> Create Tunnel
CLOUDFLARE_TUNNEL_TOKEN=PASTE_YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE

# 2. Domain & Routing
FEEDIO_DOMAIN=feedio.yourcompany.com
FEEDIO_WEB_BASE_URL=https://feedio.yourcompany.com
FEEDIO_CORS_ORIGINS=["https://feedio.yourcompany.com"]

# 3. Authentication Security
FEEDIO_AUTH_COOKIE_SECURE=true
FEEDIO_AUTH_JWT_SECRET=$JWT_SECRET
AUTH_JWT_SECRET=$JWT_SECRET
FEEDIO_AUTH_JWT_ISSUER=feedio
FEEDIO_AUTH_ACCESS_TTL_SECONDS=300
FEEDIO_AUTH_REFRESH_TTL_SECONDS=2592000

# 4. PostgreSQL Database
POSTGRES_USER=feedio_prod
POSTGRES_PASSWORD=$PG_PASSWORD
POSTGRES_DB=feedio_prod
FEEDIO_DATABASE_URL=postgresql+psycopg://feedio_prod:$PG_PASSWORD@postgres:5432/feedio_prod

# 5. Valkey Cache & Rate Limiter
FEEDIO_VALKEY_URL=redis://valkey:6379/0

# 6. RabbitMQ Broker
RABBITMQ_DEFAULT_USER=feedio_prod
RABBITMQ_DEFAULT_PASS=$RMQ_PASSWORD
FEEDIO_RABBITMQ_URL=amqp://feedio_prod:$RMQ_PASSWORD@rabbitmq:5672/

# 7. Garage S3 Object Storage
GARAGE_RPC_SECRET=$GARAGE_RPC
GARAGE_ADMIN_TOKEN=$GARAGE_ADMIN
GARAGE_METRICS_TOKEN=$GARAGE_METRICS
GARAGE_S3_ACCESS_KEY=$GARAGE_ACCESS
GARAGE_S3_SECRET_KEY=$GARAGE_SECRET
GARAGE_S3_BUCKET=feedio-media
GARAGE_LOCAL_CAPACITY=50G

# 8. Production SMTP Email (Postmark / Amazon SES / Brevo / Stalwart)
FEEDIO_SMTP_HOST=smtp.postmarkapp.com
FEEDIO_SMTP_PORT=587
FEEDIO_SMTP_START_TLS=true
FEEDIO_SMTP_USER=your_smtp_username
FEEDIO_SMTP_PASS=your_smtp_password
FEEDIO_SMTP_SENDER=Feed.io Notifications <notifications@yourcompany.com>

# 9. Error Monitoring (Optional)
GLITCHTIP_DSN=
EOF

  echo "==> Successfully created: $ENV_FILE"
fi

# Set strict file permissions (read/write only by owner)
chmod 600 "$ENV_FILE"
echo "==> Applied chmod 600 permissions to $ENV_FILE"

# Validate required variables
echo "==> Validating sensitive environment variables..."
has_error=0

check_placeholder() {
  local key="$1"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | cut -d '=' -f2- || true)
  if [[ -z "$val" ]] || [[ "$val" == *"PASTE_YOUR"* ]] || [[ "$val" == *"yourcompany"* ]]; then
    echo "  [WARNING / ERROR] Variable $key has not been configured with an actual production value!"
    return 1
  fi
  return 0
}

if ! check_placeholder "CLOUDFLARE_TUNNEL_TOKEN"; then
  echo "    -> Create a Cloudflare Tunnel in Zero Trust Dash and paste the token into $ENV_FILE"
  has_error=1
fi

if grep -q "FEEDIO_AUTH_COOKIE_SECURE=false" "$ENV_FILE"; then
  echo "  [ERROR] FEEDIO_AUTH_COOKIE_SECURE must not be 'false' in production!"
  has_error=1
fi

if (( has_error == 1 )); then
  echo ""
  echo "==> [NOTICE] Please update the values above before starting production services."
  exit 1
else
  echo "==> [SUCCESS] Environment file $ENV_FILE is ready for production."
fi
