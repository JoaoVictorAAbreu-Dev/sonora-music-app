# Sonora

Mobile music app (Expo + React Native) with its own API (Fastify + PostgreSQL) on a Google Cloud VM.
Catalog and audio come from Jamendo through the API.

```
apps/mobile      Expo Router app (dev build, not Expo Go)
apps/api         Fastify API, Drizzle migrations, Vitest tests
packages/tokens  Design tokens from the Figma variables (single source for the app)
packages/shared  Types and schemas shared by API and app (error shape, health)
infra            Docker Compose (Caddy + API + PostgreSQL), Caddyfile, backup/restore
docs             Decisions and open questions
```

## Requirements

- Node.js 22.12+ (`.nvmrc`)
- pnpm 10 through Corepack: `corepack enable` (or prefix commands with `corepack pnpm`)
- Docker (API tests start PostgreSQL with Testcontainers)

## Commands

```bash
pnpm install
pnpm run ci          # format check, lint, typecheck, all tests — same as CI
pnpm lint
pnpm typecheck
pnpm test
```

### API

```bash
docker compose -f infra/docker-compose.dev.yml up -d   # local PostgreSQL on 127.0.0.1:5432
cp apps/api/.env.example apps/api/.env
pnpm --filter @sonora/api db:migrate
pnpm --filter @sonora/api dev                          # http://localhost:3000/health
pnpm --filter @sonora/api db:generate                  # after editing src/db/schema.ts
```

API routes (all bodies validated with the Zod schemas in `packages/shared`):

| Method | Path                | Auth   |                                                           |
| ------ | ------------------- | ------ | --------------------------------------------------------- |
| GET    | `/health`           | —      | Liveness + database check                                 |
| POST   | `/v1/auth/register` | —      | email, password, acceptTerms → user + tokens              |
| POST   | `/v1/auth/login`    | —      | email, password → user + tokens                           |
| POST   | `/v1/auth/refresh`  | —      | refreshToken → rotated tokens (reuse revokes the session) |
| POST   | `/v1/auth/logout`   | —      | refreshToken → 204                                        |
| GET    | `/v1/me`            | Bearer | Current user                                              |
| PATCH  | `/v1/me`            | Bearer | displayName                                               |

### App

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @sonora/mobile android   # or ios — builds a development client
pnpm --filter @sonora/mobile start
pnpm --filter @sonora/mobile test       # Jest + React Native Testing Library
maestro test -e APP_ID=<bundle id> apps/mobile/.maestro/auth.yaml   # needs a dev build + Maestro
```

## Design tokens

Values come from the Figma file "Sonora – App de Música (Design)" (variables: Color "Escuro", Spacing,
Radius, Motion; text styles; `glass/regular`). `packages/tokens/src/figma-variables.json` is the snapshot;
`packages/tokens/test/drift.test.ts` fails if code and snapshot disagree. The app never hard-codes colors,
spacing, radii or durations (ESLint blocks color literals in `apps/mobile`).

## Deploy and backups

See [infra/README.md](infra/README.md). Nothing is deployed automatically.
