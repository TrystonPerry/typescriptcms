#!/usr/bin/env zsh

set -euo pipefail

# Conductor provides CONDUCTOR_PORT per workspace.
# We treat it as the base and reserve adjacent ports so this repo can run
# three services side-by-side without manual edits.
BASE_PORT="${CONDUCTOR_PORT:-5173}"
ADMIN_CLIENT_PORT="${ADMIN_CLIENT_PORT:-$BASE_PORT}"
ADMIN_SERVER_PORT="${ADMIN_SERVER_PORT:-$((BASE_PORT + 1))}"
EXAMPLE_PORT="${EXAMPLE_PORT:-$((BASE_PORT + 2))}"

export ADMIN_CLIENT_URL="http://localhost:${ADMIN_CLIENT_PORT}"
export ADMIN_SERVER_URL="http://localhost:${ADMIN_SERVER_PORT}"
export ADMIN_SERVER_PORT
export VITE_EXAMPLE_PREVIEW_URL="http://localhost:${EXAMPLE_PORT}"

print "[conductor:run] Starting TypeScript CMS workspace services."
print "[conductor:run] Admin UI:     ${ADMIN_CLIENT_URL}/admin"
print "[conductor:run] Admin API:    ${ADMIN_SERVER_URL}"
print "[conductor:run] Example app:  http://localhost:${EXAMPLE_PORT}"

npm exec -- concurrently \
  --names "admin-api,admin-ui,example" \
  --prefix "[{name}]" \
  --kill-others \
  "npm --workspace @typescriptcms/admin run dev:server" \
  "npm --workspace @typescriptcms/admin run dev:client -- --host 0.0.0.0 --port ${ADMIN_CLIENT_PORT} --strictPort" \
  "npm --workspace @typescriptcms/example run dev -- --host 0.0.0.0 --port ${EXAMPLE_PORT} --strictPort"
