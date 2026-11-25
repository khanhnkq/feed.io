#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Please run with root privileges (e.g., sudo bash scripts/tune-vps-kernel.sh)" >&2
  exit 1
fi

SYSCTL_FILE="/etc/sysctl.d/99-feedio-tuning.conf"

cat > "$SYSCTL_FILE" <<'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
EOF

sysctl --system >/dev/null
echo "Applied kernel tuning ($SYSCTL_FILE): swappiness=10, vfs_cache_pressure=50, congestion_control=$(sysctl -n net.ipv4.tcp_congestion_control)"
