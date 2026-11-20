#!/usr/bin/env bash
# Uptime probe for GET /health. Exit 0 when the API and database are up, 1 otherwise.
# Use from cron on another machine, or point a hosted uptime monitor (e.g. Cloud Monitoring
# uptime checks) at the same URL with the same expectations.
#   ./healthcheck.sh https://api.example.com
# HEALTHCHECK_INSECURE=1 accepts self-signed certificates (local stack only).
set -euo pipefail
base="${1:?usage: healthcheck.sh <base-url>}"
insecure=()
[ "${HEALTHCHECK_INSECURE:-}" = "1" ] && insecure=(-k)
body="$(curl -fsS "${insecure[@]}" --max-time 10 "${base%/}/health")" || { echo "DOWN: no 200 from ${base%/}/health" >&2; exit 1; }
if ! printf '%s' "$body" | grep -q '"status":"ok"'; then
  echo "DEGRADED: $body" >&2
  exit 1
fi
echo "OK: $body"
