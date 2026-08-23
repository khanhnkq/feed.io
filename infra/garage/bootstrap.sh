#!/bin/sh
set -eu

until garage node id >/tmp/garage-node 2>/dev/null; do
  sleep 2
done

node_address="$(cat /tmp/garage-node)"
node_id="${node_address%%@*}"
export GARAGE_RPC_HOST="${node_id}@127.0.0.1:3901"

until garage status >/tmp/garage-status 2>/dev/null; do
  sleep 2
done

if grep -q "NO ROLE ASSIGNED" /tmp/garage-status; then
  garage layout assign "$node_id" -z local -c "$GARAGE_LOCAL_CAPACITY"
  garage layout apply --version 1
fi

if ! garage bucket info "$GARAGE_BUCKET" >/dev/null 2>&1; then
  garage bucket create "$GARAGE_BUCKET"
fi

if ! garage key info "$GARAGE_ACCESS_KEY" >/dev/null 2>&1; then
  garage key import --yes -n feedio "$GARAGE_ACCESS_KEY" "$GARAGE_SECRET_KEY"
fi

garage bucket allow "$GARAGE_BUCKET" \
  --read \
  --write \
  --owner \
  --key "$GARAGE_ACCESS_KEY"

garage status
