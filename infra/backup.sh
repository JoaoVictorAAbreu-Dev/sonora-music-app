#!/usr/bin/env bash
# Dumps the production database and uploads it to Cloud Storage.
# Runs on the VM (cron), from the infra/ directory. Requires the gcloud CLI and a VM service
# account with roles/storage.objectCreator on BACKUP_BUCKET. Retention is a bucket lifecycle rule.
#
#   ./backup.sh            dump + upload, then delete the local copy
#   ./backup.sh --local    dump only, keep the file in ./backups (used by the restore test)
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
: "${POSTGRES_DB:=sonora}" "${POSTGRES_USER:=sonora}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups
file="backups/sonora-${stamp}.dump"

# Custom format: compressed, and restorable table by table with pg_restore.
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner >"$file"
if [ ! -s "$file" ]; then
  echo "backup failed: empty dump" >&2
  exit 1
fi
echo "dump written: $file ($(du -h "$file" | cut -f1))"

if [ "${1:-}" = "--local" ]; then
  exit 0
fi

: "${BACKUP_BUCKET:?set BACKUP_BUCKET in .env}"
gcloud storage cp "$file" "gs://${BACKUP_BUCKET}/postgres/$(basename "$file")"
rm -f -- "$file"
echo "uploaded to gs://${BACKUP_BUCKET}/postgres/"
