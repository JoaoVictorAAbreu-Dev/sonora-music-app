# Infrastructure

One Compute Engine VM runs three containers with Docker Compose:

- **caddy** — the only public service (80/443). Automatic HTTPS for `API_DOMAIN`, security headers, JSON access logs.
- **api** — the Fastify API. Applies pending migrations on start, then serves. Not exposed directly.
- **postgres** — PostgreSQL 17 with a named volume. Not exposed.

## First setup on the VM (manual, not automated)

1. Install Docker Engine and the Compose plugin; open ports 80 and 443 in the VPC firewall.
2. Point the DNS record of `API_DOMAIN` at the VM's static IP.
3. Copy `infra/` to the VM, then `cp .env.example .env`, fill it in, and `chmod 600 .env`.
4. `docker compose --env-file .env up -d` (builds the API image locally until the M8 deploy workflow pushes images).
5. Check: `curl https://$API_DOMAIN/health` → `{"status":"ok",...}`.

## Backups

`backup.sh` runs `pg_dump -Fc` inside the postgres container and uploads the dump to
`gs://$BACKUP_BUCKET/postgres/`. The VM's service account needs `roles/storage.objectCreator` on the bucket.
Set retention with a bucket lifecycle rule (for example, delete objects older than 30 days).

Suggested cron (daily at 03:15 UTC):

```cron
15 3 * * * cd /opt/sonora/infra && ./backup.sh >> /var/log/sonora-backup.log 2>&1
```

## Restore

```bash
./restore.sh gs://$BACKUP_BUCKET/postgres/sonora-<stamp>.dump   # or a local file
```

It asks for confirmation because it overwrites the target database (`pg_restore --clean`).

### Restore test (verified locally on 2026-11-19, without Cloud Storage)

With a disposable local stack: insert a probe row → `./backup.sh --local` → delete the row →
`RESTORE_CONFIRM=yes ./restore.sh backups/<file>.dump` → the row is back (count 0 → 1) and the
migrations table is intact. The Cloud Storage upload and download steps have not been run.
