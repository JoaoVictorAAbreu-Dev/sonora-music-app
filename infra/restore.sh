#!/usr/bin/env bash
# Restores a dump produced by backup.sh into the running postgres service.
#   ./restore.sh backups/sonora-<stamp>.dump            local file
#   ./restore.sh gs://<bucket>/postgres/<file>.dump     downloads first
# DESTRUCTIVE: replaces existing objects in the target database (--clean). Asks first;
# set RESTORE_CONFIRM=yes to skip the prompt (only for the automated restore test).
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
: "${POSTGRES_DB:=sonora}" "${POSTGRES_USER:=sonora}"

src="${1:?usage: restore.sh <file|gs://...>}"
if [[ "$src" == gs://* ]]; then
  mkdir -p backups
  gcloud storage cp "$src" backups/
  src="backups/$(basename "$src")"
fi

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  read -r -p "Restore $src into database '$POSTGRES_DB'? This overwrites data. [y/N] " ok
  if [ "$ok" != "y" ]; then
    echo "aborted"
    exit 1
  fi
fi

docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner <"$src"
echo "restore finished"
