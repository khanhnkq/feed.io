#!/usr/bin/env bash
set -euo pipefail

warning_limit=400
failure_limit=500
failed=0

while IFS= read -r file; do
  lines=$(wc -l < "$file" | tr -d ' ')
  if (( lines > failure_limit )); then
    echo "ERROR: $file has $lines lines (maximum: $failure_limit)"
    failed=1
  elif (( lines >= warning_limit )); then
    echo "WARNING: $file has $lines lines (split before $failure_limit)"
  fi
done < <(find . \
  -type f \
  ! -path './.git/*' \
  ! -path '*/.venv/*' \
  ! -path '*/.uv-cache/*' \
  ! -path '*/node_modules/*' \
  ! -path '*/.next/*' \
  ! -path '*/migrations/versions/*' \
  ! -path '*/generated/*' \
  ! -name '*.lock' \
  ! -name '*lock.yaml' \
  \( -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.sh' -o -name '*.yaml' -o -name '*.yml' -o -name '*.md' \) \
  | sort)

exit "$failed"
