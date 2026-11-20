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

## Deploy (GitHub Actions, manual)

`.github/workflows/deploy.yml` runs only from **Actions › Deploy API › Run workflow**. It runs the full
CI, builds the API image, pushes it to GitHub Container Registry (`ghcr.io/<owner>/sonora-api:<sha>`),
copies `infra/` to `/opt/sonora/infra` on the VM (never `.env` or `backups/`), pulls the image,
restarts with `docker compose up -d` and waits for `/health`. **It has never been run.**

Repository secrets (Settings › Secrets and variables › Actions) — values only you have:

| Secret               | What                                                     |
| -------------------- | -------------------------------------------------------- |
| `DEPLOY_HOST`        | VM address                                               |
| `DEPLOY_USER`        | SSH user on the VM (in the `docker` group)               |
| `DEPLOY_SSH_KEY`     | Private key (ed25519) authorized for that user           |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan <host>` (pins the VM key)         |
| `API_DOMAIN`         | Public API domain, used for the post-deploy health check |

Also create a `production` environment with required reviewers so each deploy needs approval.

## Privacy policy

`site/privacy.html` is served by Caddy at `https://$API_DOMAIN/privacy` (the app links to it from
Configurações). It is a **factual draft** of what the code does; it must be reviewed and completed
(controller, contact) before store submission — open question Q16.

## Monitoring

- `GET /health` returns `200 {"status":"ok"}` when the API and PostgreSQL answer, `503` otherwise.
- `./healthcheck.sh https://$API_DOMAIN` exits 0/1 for cron on another machine; or create a hosted
  uptime check (for example Cloud Monitoring) on the same URL expecting status 200 and the text
  `"status":"ok"` every 1–5 minutes, alerting by e-mail.
- Logs are JSON on stdout (`docker compose logs api caddy`). The API redacts passwords, tokens and
  `Authorization`; Caddy does not log credential headers. Verified locally on 2026-11-20 by sending
  a bearer token and searching both logs (0 matches).

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
