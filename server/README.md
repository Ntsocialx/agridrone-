# AgriDrone API

Express and TypeScript REST API, versioned under `/api/v1`, backed by Neon
Postgres.

## Requirements

- Node.js 22.13 or newer
- npm 11

## Setup and commands

```powershell
npm ci
Copy-Item .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
npm run db:migrate            # applies new files in migrations/
npm run dev
npm run lint
npm run typecheck
npm test                      # uses in-memory PGlite, never your Neon database
npm run build
```

Create the first admin (admins can never sign up through the app):

```powershell
$env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_NAME="Your Name"; $env:ADMIN_PASSWORD="<12+ chars>"
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

Migrations are plain SQL in `migrations/`, applied in name order and tracked in
`schema_migrations`. Never edit an applied file; add a new one.

## Endpoints

All routes except `auth` and `health`/`ready` need `Authorization: Bearer <token>`.
Errors are `{ "error": { "code", "message" } }`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/health`, `/ready` | anyone | `ready` checks the database |
| POST | `/auth/register` | anyone | `role`: `operator` or `farm_owner`; `acceptTerms: true` required |
| POST | `/auth/login` | anyone | rate-limited; generic error |
| GET/PUT | `/operators/me` | operator | locked while in review/approved |
| POST | `/operators/me/submit` | operator | → `in_review` |
| GET | `/admin/operators?status=` | admin | |
| POST | `/admin/operators/:id/decision` | admin | `rejected` needs `reason`; audited |
| GET | `/jobs?service=&q=` | signed in | marketplace (`open` + `on_hold`) |
| GET | `/jobs/mine` | owner, operator | posted / assigned jobs |
| POST | `/jobs` | farm owner | Spraying is created `on_hold` |
| GET | `/jobs/:id` | signed in | owners see all bids, operators only theirs |
| POST | `/jobs/:id/bids` | approved operator | not on held jobs; one per job |
| POST | `/jobs/:id/select` | job's owner | `{ bidId }`; transaction; audited |
| POST | `/jobs/:id/complete` | assigned operator | `assigned` → `pending_confirmation` |
| POST | `/jobs/:id/confirm` | job's owner | → `completed` |
| POST | `/jobs/:id/cancel` | job's owner | only `open`/`on_hold` |
| POST | `/reviews` | job's owner | `{ jobId, rating 1–5, comment }`; completed jobs only; one per job |
| POST | `/reviews/:id/report` | reviewed operator | `{ reason }`; once per review |
| GET | `/pilots/:id` | signed in | completed jobs, average rating, visible reviews |
| GET | `/admin/reviews/reports` | admin | open reports |
| POST | `/admin/reviews/:id/moderation` | admin | `{ action: "hide" \| "keep" }`; audited |

Set `CORS_ORIGINS` to a comma-separated list of trusted browser origins.
Native mobile requests do not require a browser CORS origin.
